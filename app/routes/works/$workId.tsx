import { Outlet, Form, json, Link, useLoaderData } from "remix";

import { Episode, SubscribedWorksOnUser, Work } from "@prisma/client";
import { useCallback, useState } from "react";
import { db } from "~/utils/db.server";

import * as EpisodeWatchOrUnwatchForm from "../../components/Episode/EpisodeWatchOrUnwatchForm";
import * as WorkEditForm from "~/components/WorkEditForm";
import * as WorkSubscribeForm from "~/components/Work/WorkSubscribeForm";
import * as WorkHashtagCopyButton from "~/components/Work/WorkHashtagCopyButton";
import { getUserId, requireUserId } from "~/utils/session.server";
import { extractParams, Serialized } from "~/utils/type";
import type {
  DataFunctionArgs,
  LinksFunction,
} from "@remix-run/server-runtime";
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
    episodes: (Episode & { WatchedEpisodesOnUser?: { createdAt: Date }[] })[];
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
        ...(userId
          ? {
              include: {
                WatchedEpisodesOnUser: {
                  where: { userId },
                  select: { createdAt: true },
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
              <WorkSubscribeForm.Component
                id={work.id.toString()}
                subscribing={subscribed}
              />
            )}
            <dl>
              <dt>???????????????</dt>
              <dd>
                <a href={work.officialSiteUrl ?? undefined}>
                  {work.officialSiteUrl}
                </a>
              </dd>
              <dt>?????????????????????</dt>
              <dd>
                <a href={`https://twitter.com/${work.twitterId}`}>
                  {work.twitterId}
                </a>
              </dd>
              <dt>??????????????????</dt>
              <dd>
                {work.hashtag !== null && work.hashtag !== "" && (
                  <div>
                    <a href={`https://twitter.com/hashtag/${work.hashtag}`}>
                      <span>#{work.hashtag}</span>
                    </a>
                    <WorkHashtagCopyButton.Component hashtag={work.hashtag} />
                  </div>
                )}
              </dd>
            </dl>
            <section>
              <h3>?????????????????????</h3>
              <table>
                <tr>
                  <th>??????</th>
                  <th>?????????</th>
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
                      <td>
                        <Form method="post">
                          <input
                            type="hidden"
                            name="count"
                            value={episode.count}
                          />
                          <button type="submit" name="_action" value="delete">
                            ??????
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
          ?????????????????????
        </button>
        {appendEpisodesOpened && (
          <Form method="post">
            <ul>
              <li>
                <label>
                  ????????????
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
                  ???????????????????????????????????????
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
                  ?????????
                  <input type="number" name="length" defaultValue={13} />
                </label>
              </li>
              <li>
                <button type="submit" name="_action" value="addEpisodes">
                  ??????
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
