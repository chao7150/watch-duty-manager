import { Outlet } from "remix";

import {
  Episode,
  Prisma,
  SubscribedWorksOnUser,
  WatchedEpisodesOnUser,
  Work,
} from "@prisma/client";
import { useCallback, useState } from "react";
import { ActionFunction, Form, json, Link, useLoaderData } from "remix";
import { db } from "~/utils/db.server";

import * as WorkCreateForm from "../../components/WorkCreateForm";
import * as EpisodeWatchOrUnwatchForm from "../../components/Episode/EpisodeWatchOrUnwatchForm";
import * as WorkEditForm from "~/components/WorkEditForm";
import { getUserId, requireUserId } from "~/utils/session.server";
import { extractParams, Serialized } from "~/utils/type";
import { DataFunctionArgs, LinksFunction } from "@remix-run/server-runtime";
import { match } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/function";

export const links: LinksFunction = () => {
  return [
    {
      rel: "stylesheet",
      href: "https://unpkg.com/css.gg/icons/css/clipboard.css",
    },
  ];
};

type LoaderData = {
  work: Work & {
    users: SubscribedWorksOnUser[];
    episodes: (Episode & { WatchedEpisodesOnUser: { createdAt: Date }[] })[];
  };
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
        include: {
          WatchedEpisodesOnUser: {
            where: { userId },
            select: { createdAt: true },
          },
        },
      },
    },
  });
  if (work === null) {
    throw Error("work not found");
  }
  return {
    work,
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
    await db.episode.delete({ where: { workId_count: { workId, count } } });
    await db.episode.updateMany({
      where: { workId, count: { gt: count } },
      data: { count: { decrement: 1 } },
    });
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
  return pipe(
    await WorkEditForm.serverAction(workId, formData),
    match(
      ({ errorMessage, status }) => json({ errorMessage }, { status }),
      ({ successMessage, status }) => json({ successMessage }, { status })
    )
  );
};

export default function Work() {
  const [editMode, setEditMode] = useState(false);
  const [appendEpisodesOpened, openAppendEpisodes] = useState(false);
  const turnEditMode = useCallback(() => setEditMode((s) => !s), []);
  const { loggedIn, work, subscribed } =
    useLoaderData<Serialized<LoaderData>>();
  const defaultValueMap: WorkEditForm.Props = {
    workId: work.id,
    title: { defaultValue: work.title ?? "" },
    officialSiteUrl: { defaultValue: work.officialSiteUrl ?? "" },
    twitterId: { defaultValue: work.twitterId ?? "" },
    hashTag: { defaultValue: work.hashtag ?? "" },
  };

  return (
    <div style={{ display: "flex" }}>
      <div>
        <button onClick={turnEditMode}>
          {editMode ? "end edit" : "start edit"}
        </button>
        <h2>{work.title}</h2>
        {editMode ? (
          <WorkEditForm.Component {...defaultValueMap} />
        ) : (
          <>
            {loggedIn && (
              <Form method="post">
                {subscribed ? (
                  <button name="_action" value="unsubscribe">
                    unsubscribe
                  </button>
                ) : (
                  <button name="_action" value="subscribe">
                    subscribe
                  </button>
                )}
              </Form>
            )}
            <dl>
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
                <a href={`https://twitter.com/hashtag/${work.hashtag}`}>
                  #{work.hashtag}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`#${work.hashtag}`);
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M8 11C7.44772 11 7 11.4477 7 12C7 12.5523 7.44772 13 8 13H15.9595C16.5118 13 16.9595 12.5523 16.9595 12C16.9595 11.4477 16.5118 11 15.9595 11H8Z"
                      fill="currentColor"
                    />
                    <path
                      d="M8.04053 15.0665C7.48824 15.0665 7.04053 15.5142 7.04053 16.0665C7.04053 16.6188 7.48824 17.0665 8.04053 17.0665H16C16.5523 17.0665 17 16.6188 17 16.0665C17 15.5142 16.5523 15.0665 16 15.0665H8.04053Z"
                      fill="currentColor"
                    />
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M5 3C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5ZM7 5H5L5 19H19V5H17V6C17 7.65685 15.6569 9 14 9H10C8.34315 9 7 7.65685 7 6V5ZM9 5V6C9 6.55228 9.44772 7 10 7H14C14.5523 7 15 6.55228 15 6V5H9Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </dd>
            </dl>
            <section>
              <h3>登録済みの話数</h3>
              <table>
                <tr>
                  <th>話数</th>
                  <th>公開日</th>
                  <th></th>
                </tr>
                {work.episodes.map((episode) => {
                  return (
                    <tr key={`${episode.workId}-${episode.count}`}>
                      <td>
                        <Link to={`${episode.count}`}>{episode.count}</Link>
                      </td>
                      <td>
                        {new Date(episode.publishedAt).toLocaleDateString()}
                      </td>
                      <td>
                        <EpisodeWatchOrUnwatchForm.Component
                          workId={episode.workId}
                          count={episode.count}
                          watched={
                            episode.WatchedEpisodesOnUser[0] !== undefined
                          }
                        />
                      </td>
                      <td>
                        <Form method="post">
                          <input
                            type="hidden"
                            name="count"
                            value={episode.count}
                          />
                          <button type="submit" name="_action" value="delete">
                            削除
                          </button>
                        </Form>
                      </td>
                    </tr>
                  );
                })}
              </table>
            </section>
          </>
        )}
        <button type="button" onClick={() => openAppendEpisodes((c) => !c)}>
          話数を追加する
        </button>
        {appendEpisodesOpened && (
          <Form method="post">
            <ul>
              <li>
                <input
                  type="hidden"
                  name="publishedAtOffset"
                  value={work.episodes[work.episodes.length - 1].publishedAt}
                />
                <label>
                  開始日時
                  <input
                    type="datetime-local"
                    name="startDate"
                    defaultValue={new Date(
                      Math.max(
                        ...work.episodes.map((e) =>
                          new Date(e.publishedAt).getTime()
                        )
                      ) +
                        1000 * 60 * 60 * (24 * 7 + 9)
                    )
                      .toISOString()
                      .slice(0, -8)}
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
                  <input type="number" name="length" defaultValue={13} />
                </label>
              </li>
              <li>
                <button type="submit" name="_action" value="addEpisodes">
                  送信
                </button>
              </li>
            </ul>
          </Form>
        )}
      </div>
      <Outlet />
    </div>
  );
}
