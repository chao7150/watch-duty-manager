import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import urlFrom from "url-from";

import { db } from "~/utils/db.server";
import { getUserId, requireUserId } from "~/utils/session.server";
import { extractParams, nonEmptyStringOrUndefined } from "~/utils/type";

export const bindUrl = urlFrom`/works/${"workId:number"}/${"count:number"}`;

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  const { workId, count } = extractParams(params, ["workId", "count"]);
  const episodePromise = db.episode.findUnique({
    where: {
      workId_count: {
        workId: parseInt(workId, 10),
        count: parseInt(count, 10),
      },
    },
    include: {
      work: { select: { title: true } },
    },
  });
  const historiesPromise = db.episodeStatusOnUser.findMany({
    where: {
      workId: parseInt(workId, 10),
      count: parseInt(count, 10),
      status: "watched",
    },
  });
  const [episode, histories] = await Promise.all([
    episodePromise,
    historiesPromise,
  ]);
  if (episode === null) {
    throw Error("episode not found");
  }
  return {
    myHistory: userId && histories.find((w) => w.userId === userId),
    // 他のユーザーの情報は必要以上に返さない
    otherHistories: histories
      .filter((h) => h.userId !== userId)
      .map((h) => {
        return {
          comment: h.comment,
          rating: h.rating,
        };
      }),
    episode,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { workId: _workId, count: _count } = extractParams(params, [
    "workId",
    "count",
  ]);
  const workId = parseInt(_workId, 10);
  const count = parseInt(_count, 10);

  const formData = Object.fromEntries(await request.formData());

  if (request.method === "PATCH") {
    if (formData._action === "add_title_description") {
      const { title, description } = nonEmptyStringOrUndefined(formData, [
        "title",
        "description",
      ]);
      await db.episode.update({
        where: {
          workId_count: {
            workId,
            count,
          },
        },
        data: {
          title: title || null,
          description: description || null,
        },
      });
    }
    return null;
  }

  const userId = await requireUserId(request);

  if (formData._action === "unwatch") {
    await db.episodeStatusOnUser.delete({
      where: { userId_workId_count: { userId, workId, count } },
    });
    return null;
  }

  if (formData._action === "skip") {
    await db.episodeStatusOnUser.upsert({
      where: { userId_workId_count: { userId, workId, count } },
      create: {
        userId,
        workId,
        count,
        status: "skipped",
        createdAt: new Date(),
      },
      update: {
        status: "skipped",
      },
    });
    return null;
  }

  const { comment, rating: _rating } = nonEmptyStringOrUndefined(formData, [
    "comment",
    "rating",
  ]);
  const rating = Number(_rating);
  if (
    _rating !== undefined &&
    ![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(rating)
  ) {
    throw new Response("invalid rating", { status: 400 });
  }

  await db.episodeStatusOnUser.upsert({
    where: { userId_workId_count: { userId, workId, count } },
    create: {
      userId,
      workId,
      count,
      status: "watched",
      comment,
      rating: _rating === undefined ? undefined : rating,
      createdAt: new Date(),
    },
    update: {
      status: "watched",
      comment,
      rating: _rating === undefined ? undefined : rating,
    },
  });
  return null;
};

export default function Component() {
  const { myHistory, otherHistories, episode } = useLoaderData<typeof loader>();

  return (
    <div>
      <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 p-2 shadow-menu">
        <dt>放送日時</dt>
        <dd>{new Date(episode.publishedAt).toLocaleString("ja")}</dd>
        {episode.title && (
          <>
            <dt>タイトル</dt>
            <dd>
              <p>{episode.title}</p>
            </dd>
          </>
        )}
        {episode.description && (
          <>
            <dt>あらすじ</dt>
            <dd>
              <p>{episode.description}</p>
            </dd>
          </>
        )}

        {myHistory && (
          <>
            <dt>視聴日時</dt>
            <dd>{new Date(myHistory.createdAt).toLocaleString("ja")}</dd>
          </>
        )}
        {myHistory && myHistory.rating !== null && (
          <>
            <dt>あなたの評価</dt>
            <dd>{myHistory.rating}点</dd>
          </>
        )}
        {myHistory && myHistory.comment && (
          <>
            <dt>あなたの感想</dt>
            <dd>
              <p className="whitespace-pre-wrap break-all">
                {myHistory.comment}
              </p>
            </dd>
          </>
        )}
        {otherHistories.map((otherHistory) => {
          return (
            <>
              {otherHistory.rating !== null && (
                <>
                  <dt>他の視聴者の評価</dt>
                  <dd>{otherHistory.rating}点</dd>
                </>
              )}
              {otherHistory.comment && (
                <>
                  <dt>他の視聴者の感想</dt>
                  <dd>
                    <p className="whitespace-pre-wrap break-words">
                      {otherHistory.comment}
                    </p>
                  </dd>
                </>
              )}
            </>
          );
        })}
      </dl>
    </div>
  );
}
