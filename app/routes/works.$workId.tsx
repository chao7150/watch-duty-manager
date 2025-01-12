import type { LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { data } from "@remix-run/node";
import {
  Form,
  Link,
  Outlet,
  useLoaderData,
  useMatches,
} from "@remix-run/react";

import { Fragment, useCallback, useState } from "react";

import * as E from "fp-ts/lib/Either.js";
import * as F from "fp-ts/lib/function.js";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";
import urlFrom from "url-from";

import * as EpisodeWatchForm from "~/components/Episode/WatchForm";
import * as CloseIcon from "~/components/Icons/Close";
import * as EditIcon from "~/components/Icons/Edit";
import * as TrashIcon from "~/components/Icons/Trash";
import * as WorkHashtagCopyButton from "~/components/Work/WorkHashtagCopyButton";
import * as WorkSubscribeForm from "~/components/Work/WorkSubscribeForm";
import { EpisodeDateRegistrationTabPanel } from "~/components/work-create-form/component";
import { serverAction as WorkEditFormServerAction } from "~/components/work-edit-form/action.server";
import {
  Component as WorkEditFormComponent,
  type Props as WorkEditFormProps,
} from "~/components/work-edit-form/component";

import { db } from "~/utils/db.server";
import { getUserId, requireUserId } from "~/utils/session.server";
import { extractParams, isNumber } from "~/utils/type";

export const bindUrl = urlFrom`/works/${"workId:number"}`;

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = (await getUserId(request)) ?? undefined;
  const { workId } = extractParams(params, ["workId"]);
  const workPromise = db.work.findUnique({
    where: { id: parseInt(workId, 10) },
    include: {
      users: {
        where: { userId },
      },
      episodes: {
        orderBy: { count: "asc" },
        ...(userId
          ? {
              include: {
                WatchedEpisodesOnUser: {
                  where: { userId },
                  select: { createdAt: true, rating: true },
                },
              },
            }
          : {}),
      },
    },
  });
  const ratingsPromise =
    userId !== undefined
      ? db.watchedEpisodesOnUser.findMany({
          select: {
            episode: {
              select: {
                count: true,
              },
            },
            rating: true,
          },
          where: {
            workId: parseInt(workId, 10),
            userId,
          },
          orderBy: {
            episode: {
              count: "asc",
            },
          },
        })
      : Promise.resolve([]);
  const [work, ratings] = await Promise.all([workPromise, ratingsPromise]);
  if (work === null) {
    throw Error("work not found");
  }
  if (userId === undefined) {
    return {
      work,
      rating: 0,
      ratings: [],
      subscribed: false,
      loggedIn: false,
      workTags: [],
      userTags: [],
    };
  }
  const map = new Map<number, number | null>();
  ratings.forEach((r) => {
    map.set(r.episode.count, r.rating);
  });
  const nonNullRatings = ratings.map((r) => r.rating).filter(isNumber);

  return {
    // usersを残すと誰が視聴しているかpublicに見えてしまうので消す
    work: { ...work, users: undefined },
    rating:
      nonNullRatings.length === 0
        ? 0
        : nonNullRatings.reduce((acc, val) => acc + val, 0) /
          nonNullRatings.length,
    ratings: Array.from({ length: work.episodes.length }).map((_, idx) => {
      return { count: idx + 1, rating: map.get(idx + 1) ?? null };
    }),
    subscribed: work?.users.length === 1,
    loggedIn: userId !== undefined,
  };
};

export const action = async ({ request, params }: LoaderFunctionArgs) => {
  const { workId: _workId } = extractParams(params, ["workId"]);
  const workId = parseInt(_workId, 10);

  const formData = await request.formData();
  if (formData.get("_action") === "delete") {
    const { count: _count } = extractParams(Object.fromEntries(formData), [
      "count",
    ]);
    const count = parseInt(_count, 10);
    await db.$transaction([
      db.episode.delete({
        where: { workId_count: { workId, count } },
      }),
      db.episode.updateMany({
        where: { workId, count: { gt: count } },
        data: { count: { decrement: 1 } },
      }),
    ]);
    return data({ message: "success" }, { status: 200 });
  }
  if (formData.get("_action") === "addEpisodes") {
    const { episodeDate: _episodeDate, offset: _offset } = extractParams(
      Object.fromEntries(formData),
      ["episodeDate", "offset"],
    );
    const episodeDate = _episodeDate.split(",").map((d) => new Date(d));
    const offset = parseInt(_offset, 10);
    await db.episode.createMany({
      data: episodeDate.map((date, index) => ({
        count: offset + index,
        workId,
        publishedAt: date,
      })),
    });
    return data({ message: "success" }, { status: 200 });
  }
  if (formData.get("_action") === "unsubscribe") {
    const userId = await requireUserId(request);
    await db.subscribedWorksOnUser.delete({
      where: { userId_workId: { userId, workId } },
    });
    return data({ message: "success" }, { status: 200 });
  }
  if (formData.get("_action") === "subscribe") {
    const userId = await requireUserId(request);

    try {
      const rel = await db.subscribedWorksOnUser.create({
        data: {
          userId,
          workId,
        },
      });
      return data(
        { message: `${rel.userId} ${rel.workId} ok` },
        { status: 200 },
      );
    } catch (_) {
      return data({ message: "db error" }, { status: 400 });
    }
  }
  return F.pipe(
    await WorkEditFormServerAction(request, workId, formData),
    E.match(
      ({ errorMessage, status }) => data({ message: errorMessage }, { status }),
      ({ successMessage, status }) =>
        data({ message: successMessage }, { status }),
    ),
  );
};

export default function Component() {
  const [editMode, setEditMode] = useState(false);
  const [episodesEditMode, setEpisodesEditMode] = useState(false);
  const turnEditMode = useCallback(() => setEditMode((s) => !s), []);
  const { loggedIn, work, subscribed, rating, ratings } =
    useLoaderData<typeof loader>();
  const countMatch = useMatches().find(
    (m) => m.id === "routes/works.$workId.$count",
  );
  const outletId = countMatch && Number(countMatch.params.count);
  const defaultValueMap: WorkEditFormProps = {
    workId: work.id,
    workInput: {
      workTitle: { defaultValue: work.title ?? "" },
      durationMin: { defaultValue: work.durationMin },
      officialSiteUrl: { defaultValue: work.officialSiteUrl ?? "" },
      twitterId: { defaultValue: work.twitterId ?? "" },
      hashtag: { defaultValue: work.hashtag ?? "" },
    },
  };

  return (
    <div>
      <div className="flex">
        <h2 className="flex items-center">
          <Link to={bindUrl({ workId: work.id })}>{work.title}</Link>
        </h2>
        {loggedIn && (
          <>
            <div className="ml-4">
              <WorkSubscribeForm.Component
                id={work.id.toString()}
                subscribing={subscribed}
              />
            </div>
            <div className="ml-4 flex items-center">
              <div>{rating.toFixed(1)}</div>
            </div>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-8 pt-8">
        <div className="flex flex-col justify-between gap-4">
          <div>
            <section>
              <header className="flex">
                <h3>作品情報</h3>
                <button className="ml-2" onClick={turnEditMode}>
                  {editMode ? <CloseIcon.Component /> : <EditIcon.Component />}
                </button>
              </header>
              {editMode ? (
                <WorkEditFormComponent {...defaultValueMap} />
              ) : (
                <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
                  <dt>尺</dt>
                  <dd>{work.durationMin}分</dd>
                  <dt>公式サイト</dt>
                  <dd>
                    <a
                      href={work.officialSiteUrl ?? undefined}
                      className="hover:underline"
                    >
                      {work.officialSiteUrl}
                    </a>
                  </dd>
                  <dt>公式ツイッター</dt>
                  <dd>
                    <a
                      href={`https://twitter.com/${work.twitterId}`}
                      className="hover:underline"
                    >
                      {work.twitterId}
                    </a>
                  </dd>
                  <dt>ハッシュタグ</dt>
                  <dd>
                    {work.hashtag !== null && work.hashtag !== "" && (
                      <span className="flex items-center">
                        <a
                          href={`https://twitter.com/hashtag/${work.hashtag}`}
                          className="hover:underline"
                        >
                          <span>#{work.hashtag}</span>
                        </a>
                        <span className="w-5 h-6">
                          <WorkHashtagCopyButton.Component
                            hashtag={work.hashtag}
                          />
                        </span>
                      </span>
                    )}
                  </dd>
                  <dt>配信サービス</dt>
                  <dd>
                    <Link
                      to={`https://animestore.docomo.ne.jp/animestore/sch_pc?searchKey=${encodeURIComponent(
                        work.title,
                      )}&vodTypeList=svod_tvod`}
                    >
                      dアニメストア
                    </Link>
                  </dd>
                </dl>
              )}
            </section>
          </div>
          <section className="flex-1">
            <ResponsiveContainer height={300}>
              <LineChart data={ratings}>
                <CartesianGrid />
                <XAxis dataKey="count" domain={[1, "dataMax"]} />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                <Tooltip />
                <Line type="monotone" dataKey="rating" />
              </LineChart>
            </ResponsiveContainer>
          </section>
        </div>
        <section>
          <header className="flex">
            <h3>放送スケジュール</h3>
            <button
              className="ml-2"
              type="button"
              onClick={() => setEpisodesEditMode((c) => !c)}
            >
              {episodesEditMode ? (
                <CloseIcon.Component />
              ) : (
                <EditIcon.Component />
              )}
            </button>
          </header>
          <div className="flex flex-row gap-4 mt-4">
            <div>
              <table className="mt-2 border-spacing-2">
                <thead>
                  <tr>
                    <th className="w-9">話数</th>
                    <th className="w-[10ch]">公開日</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {work.episodes.map((episode) => {
                    const linkTo =
                      outletId === episode.count ? "." : `${episode.count}`;
                    return (
                      <Fragment key={`${episode.workId}-${episode.count}`}>
                        <tr>
                          <td>
                            <Link to={linkTo} preventScrollReset={true}>
                              {episode.count}
                            </Link>
                          </td>
                          <td>
                            <Link to={linkTo} preventScrollReset={true}>
                              {new Date(episode.publishedAt).toLocaleDateString(
                                "ja",
                              )}
                            </Link>
                          </td>
                          <td className="pl-2">
                            {new Date(episode.publishedAt) < new Date() && (
                              <EpisodeWatchForm.Component
                                workId={episode.workId}
                                count={episode.count}
                                watched={
                                  // @ts-expect-error クエリを動的に動的に生成しているので型がついていない
                                  episode.WatchedEpisodesOnUser
                                    ? // @ts-expect-error クエリを動的に動的に生成しているので型がついていない
                                      episode.WatchedEpisodesOnUser.length >= 1
                                    : false
                                }
                              />
                            )}
                          </td>
                          {episodesEditMode && (
                            <td className="align-middle">
                              <Form method="POST">
                                <input
                                  type="hidden"
                                  name="count"
                                  value={episode.count}
                                />
                                <button
                                  className="align-middle"
                                  type="submit"
                                  name="_action"
                                  value="delete"
                                  title=""
                                >
                                  <TrashIcon.Component />
                                </button>
                              </Form>
                            </td>
                          )}
                        </tr>
                        {outletId === episode.count && (
                          <tr className="">
                            <td colSpan={3}>
                              <div className="my-4 ml-4 max-w-full overflow-auto">
                                <Outlet />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {episodesEditMode && (
              <section>
                <h4>話数を追加する</h4>
                <Form method="POST">
                  <ul className="mt-2 flex flex-col gap-2">
                    <li>
                      <label>
                        <div>追加する最初の話数カウント</div>
                        <input
                          type="number"
                          name="offset"
                          defaultValue={
                            Math.max(...work.episodes.map((e) => e.count)) + 1
                          }
                        />
                      </label>
                    </li>
                    <li>
                      <EpisodeDateRegistrationTabPanel />
                    </li>
                    <li>
                      <button
                        className="bg-accent-area rounded-full py-1 px-3"
                        type="submit"
                        name="_action"
                        value="addEpisodes"
                      >
                        送信
                      </button>
                    </li>
                  </ul>
                </Form>
              </section>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
