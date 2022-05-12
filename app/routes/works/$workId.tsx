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
import { getUserId, requireUserId } from "~/utils/session.server";
import { extractParams, Serialized } from "~/utils/type";
import { DataFunctionArgs } from "@remix-run/server-runtime";

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

export const action: ActionFunction = async ({ request, params }) => {
  const { workId: _workId } = extractParams(params, ["workId"]);
  const workId = parseInt(_workId, 10);

  const formData = await request.formData();
  if (formData.get("_action") === "delete") {
    const { count: _count } = extractParams(Object.fromEntries(formData), [
      "count",
    ]);
    const count = parseInt(_count, 10);
    await db.episode.delete({ where: { workId_count: { workId, count } } });
    await db.episode.updateMany({
      where: { count: { gt: count } },
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
  let work: Prisma.WorkCreateInput;
  try {
    work = WorkCreateForm.serverValidator(formData);
  } catch (errorMessage) {
    return json({ errorMessage }, { status: 400 });
  }

  try {
    const returnedWork = await db.work.update({
      where: { id: workId },
      data: work,
    });
    return json(returnedWork, { status: 200 });
  } catch {
    return json(
      {
        errorMessage: `work already exists`,
      },
      { status: 409 }
    );
  }
};

export default function Work() {
  const [editMode, setEditMode] = useState(false);
  const [appendEpisodesOpened, openAppendEpisodes] = useState(false);
  const turnEditMode = useCallback(() => setEditMode((s) => !s), []);
  const { loggedIn, work, subscribed } =
    useLoaderData<Serialized<LoaderData>>();
  const defaultValueMap: WorkCreateForm.Props = {
    title: { defaultValue: work.title ?? "" },
    publishedAt: {
      defaultValue: work.publishedAt.slice(0, 7),
    },
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
          <WorkCreateForm.Component {...defaultValueMap} />
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
              <dd>#{work.hashtag}</dd>
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
                          withComment={false}
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
