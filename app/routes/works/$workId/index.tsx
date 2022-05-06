import { Episode, Prisma, SubscribedWorksOnUser, Work } from "@prisma/client";
import { useCallback, useState } from "react";
import {
  ActionFunction,
  Form,
  json,
  Link,
  LoaderFunction,
  redirect,
  useLoaderData,
} from "remix";
import { db } from "~/utils/db.server";

import * as WorkCreateForm from "../../../components/WorkCreateForm";
import { getUserId, requireUserId } from "~/utils/session.server";
import { extractParams } from "~/utils/type";

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = (await getUserId(request)) ?? undefined;
  const { workId } = extractParams(params, ["workId"]);
  const work = await db.work.findUnique({
    where: { id: parseInt(workId, 10) },
    include: {
      users: { where: { userId } },
      episodes: { orderBy: { count: "asc" } },
    },
  });
  return {
    ...work,
    userId: undefined,
    subscribed: work?.users.length === 1,
    loggedIn: userId !== undefined,
  };
};

export const action: ActionFunction = async ({ request, params }) => {
  const { workId: _workId } = extractParams(params, ["workId"]);
  const workId = parseInt(_workId, 10);

  const formData = await request.formData();
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

type ClientWork = Omit<Work, "publishedAt"> & {
  users: SubscribedWorksOnUser[];
  episodes: Episode[];
  publishedAt: string;
  subscribed: boolean;
  loggedIn: boolean;
};

export default function Work() {
  const [editMode, setEditMode] = useState(false);
  const turnEditMode = useCallback(() => setEditMode((s) => !s), []);
  const { loggedIn, ...work } = useLoaderData<ClientWork>();
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
              {work.subscribed ? (
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
                <th>公開時刻</th>
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
                      {new Date(episode.publishedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
            </table>
          </section>
        </>
      )}
    </div>
  );
}
