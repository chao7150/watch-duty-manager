import { Outlet, Form, json, Link, useLoaderData } from "remix";

import { Episode, SubscribedWorksOnUser, Work } from "@prisma/client";
import { useCallback, useState } from "react";
import type { DataFunctionArgs } from "@remix-run/server-runtime";
import * as E from "fp-ts/Either";
import * as F from "fp-ts/function";
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
import * as EpisodeWatchOrUnwatchForm from "../../components/Episode/EpisodeWatchOrUnwatchForm";
import { db } from "~/utils/db.server";

import * as WorkEditForm from "~/components/WorkEditForm";
import * as WorkSubscribeForm from "~/components/Work/WorkSubscribeForm";
import * as WorkHashtagCopyButton from "~/components/Work/WorkHashtagCopyButton";
import * as EditIcon from "../../components/Icons/Edit";
import * as CloseIcon from "../../components/Icons/Close";
import * as TrashIcon from "../../components/Icons/Trash";
import * as PlusIcon from "../../components/Icons/Plus";
import { getUserId, requireUserId } from "~/utils/session.server";
import { extractParams, Serialized } from "~/utils/type";

type LoaderData = {
  work: Work & {
    users: SubscribedWorksOnUser[];
    episodes: (Episode & { WatchedEpisodesOnUser?: { createdAt: Date }[] })[];
  };
  ratings: { count: number; rating: number | null }[];
  subscribed: boolean;
  loggedIn: boolean;
};
export const loader = async ({
  request,
  params,
}: DataFunctionArgs): Promise<LoaderData> => {
  const userId = (await getUserId(request)) ?? undefined;
  const { workId } = extractParams(params, ["workId"]);
  const work = await db.work.findUnique({
    where: { id: parseInt(workId, 10) },
    include: {
      users: { where: { userId } },
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
  if (work === null) {
    throw Error("work not found");
  }
  if (userId === undefined) {
    return {
      work,
      ratings: [],
      subscribed: work?.users.length === 1,
      loggedIn: userId !== undefined,
    };
  }
  const ratings = await db.watchedEpisodesOnUser.findMany({
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
  });
  const map = new Map<number, number | null>();
  ratings.forEach((r) => {
    map.set(r.episode.count, r.rating);
  });
  return {
    work,
    ratings: Array.from({ length: work.episodes.length }).map((_, idx) => {
      return { count: idx + 1, rating: map.get(idx + 1) ?? null };
    }),
    subscribed: work?.users.length === 1,
    loggedIn: userId !== undefined,
  };
};

type ActionData = Response | null;

export const action = async ({
  request,
  params,
}: DataFunctionArgs): Promise<ActionData> => {
  const { workId: _workId } = extractParams(params, ["workId"]);
  const workId = parseInt(_workId, 10);

  const formData = await request.formData();
  if (formData.get("_action") === "watchUpTo") {
    const userId = await requireUserId(request);
    const { upToCount: _upToCount } = extractParams(
      Object.fromEntries(formData),
      ["upToCount"]
    );
    const upToCount = parseInt(_upToCount, 10);
    const alreadyWatchedCounts = (
      await db.watchedEpisodesOnUser.findMany({
        where: { workId, userId },
        select: { count: true },
      })
    ).map((w) => w.count);
    await db.watchedEpisodesOnUser.createMany({
      data: Array.from({ length: upToCount })
        .map((_, index) => index + 1)
        .filter((count) => !alreadyWatchedCounts.includes(count))
        .map((count) => {
          return { workId, count, createdAt: new Date(), userId };
        }),
    });
    return null;
  }
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
  }
  if (formData.get("_action") === "addEpisodes") {
    const {
      startDate,
      offset: _offset,
      length: _length,
    } = extractParams(Object.fromEntries(formData), [
      "startDate",
      "offset",
      "length",
    ]);
    const offset = parseInt(_offset, 10);
    const length = parseInt(_length, 10);
    await db.episode.createMany({
      data: Array.from({ length }).map((_, index) => ({
        count: offset + index,
        workId,
        publishedAt: new Date(
          new Date(startDate).getTime() + index * 1000 * 60 * 60 * 24 * 7
        ),
      })),
    });
    return null;
  }
  if (formData.get("_action") === "unsubscribe") {
    const userId = await requireUserId(request);
    await db.subscribedWorksOnUser.delete({
      where: { userId_workId: { userId, workId } },
    });
    return json({}, { status: 200 });
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
      return json(rel, { status: 200 });
    } catch (e) {
      return json({ errorMessage: "db error" }, { status: 400 });
    }
  }
  return F.pipe(
    await WorkEditForm.serverAction(workId, formData),
    E.match(
      ({ errorMessage, status }) => json({ errorMessage }, { status }),
      ({ successMessage, status }) => json({ successMessage }, { status })
    )
  );
};

export default function Work() {
  const [editMode, setEditMode] = useState(false);
  const [episodesEditMode, setEpisodesEditMode] = useState(false);
  const turnEditMode = useCallback(() => setEditMode((s) => !s), []);
  const { loggedIn, work, subscribed, ratings } =
    useLoaderData<Serialized<LoaderData>>();
  const defaultValueMap: WorkEditForm.Props = {
    workId: work.id,
    title: { defaultValue: work.title ?? "" },
    officialSiteUrl: { defaultValue: work.officialSiteUrl ?? "" },
    twitterId: { defaultValue: work.twitterId ?? "" },
    hashTag: { defaultValue: work.hashtag ?? "" },
  };

  return (
    <div>
      <div className="flex">
        <h2 className="flex items-center">
          <Link to={`/works/${work.id}`}>{work.title}</Link>
        </h2>
        {loggedIn && (
          <div className="ml-4">
            <WorkSubscribeForm.Component
              id={work.id.toString()}
              subscribing={subscribed}
            />
          </div>
        )}
      </div>
      <div className="pt-8">
        <div className="flex flex-row flex-wrap justify-between gap-4">
          <div>
            <>
              <section>
                <header className="flex">
                  <h3>作品情報</h3>
                  <button className="ml-2" onClick={turnEditMode}>
                    {editMode ? (
                      <CloseIcon.Component />
                    ) : (
                      <EditIcon.Component />
                    )}
                  </button>
                </header>
                {editMode ? (
                  <WorkEditForm.Component {...defaultValueMap} />
                ) : (
                  <dl className="mt-2">
                    <dt>公式サイト</dt>
                    <dd>
                      <a href={work.officialSiteUrl ?? undefined}>
                        {work.officialSiteUrl}
                      </a>
                    </dd>
                    <dt>公式ツイッター</dt>
                    <dd>
                      <a href={`https://twitter.com/${work.twitterId}`}>
                        {work.twitterId}
                      </a>
                    </dd>
                    <dt>ハッシュタグ</dt>
                    <dd>
                      {work.hashtag !== null && work.hashtag !== "" && (
                        <div>
                          <a
                            href={`https://twitter.com/hashtag/${work.hashtag}`}
                          >
                            <span>#{work.hashtag}</span>
                          </a>
                          <WorkHashtagCopyButton.Component
                            hashtag={work.hashtag}
                          />
                        </div>
                      )}
                    </dd>
                  </dl>
                )}
              </section>
            </>
          </div>
          <section className="flex flex-col">
            <div>
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
              <table className="mt-2 border-spacing-2">
                <thead>
                  <tr>
                    <th>話数</th>
                    <th>公開日</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {work.episodes.map((episode) => {
                    return (
                      <tr key={`${episode.workId}-${episode.count}`}>
                        <td>
                          <Link to={`${episode.count}`}>{episode.count}</Link>
                        </td>
                        <td>
                          {new Date(episode.publishedAt).toLocaleDateString()}
                        </td>
                        <td className="ml-2">
                          {new Date(episode.publishedAt) < new Date() && (
                            <EpisodeWatchOrUnwatchForm.Component
                              workId={episode.workId}
                              count={episode.count}
                              watched={
                                episode.WatchedEpisodesOnUser
                                  ? episode.WatchedEpisodesOnUser.length >= 1
                                  : false
                              }
                            />
                          )}
                        </td>
                        {episodesEditMode && (
                          <td className="align-middle">
                            <Form method="post">
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
                    );
                  })}
                </tbody>
              </table>
              {episodesEditMode && (
                <section className="mt-2">
                  <h4>話数を追加する</h4>
                  <Form method="post">
                    <ul>
                      <li>
                        <label>
                          開始日時
                          <input
                            type="datetime-local"
                            name="startDate"
                            defaultValue={
                              work.episodes.length !== 0
                                ? new Date(
                                    Math.max(
                                      ...work.episodes.map((e) =>
                                        new Date(e.publishedAt).getTime()
                                      )
                                    ) +
                                      1000 * 60 * 60 * (24 * 7 + 9)
                                  )
                                    .toISOString()
                                    .slice(0, -8)
                                : undefined
                            }
                          />
                        </label>
                      </li>
                      <li>
                        <label>
                          追加する最初の話数カウント
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
                        <label>
                          何話分
                          <input
                            type="number"
                            name="length"
                            defaultValue={13}
                          />
                        </label>
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
          <section className="basis-graph">
            <ResponsiveContainer height={300}>
              <LineChart data={ratings}>
                <CartesianGrid />
                <XAxis dataKey="count" domain={[1, "dataMax"]} />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rating" />
              </LineChart>
            </ResponsiveContainer>
          </section>
        </div>
        <section className="mt-4">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
