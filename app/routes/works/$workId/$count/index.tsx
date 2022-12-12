import { Episode } from "@prisma/client";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";
import { getUserId, requireUserId } from "~/utils/session.server";
import { extractParams, nonEmptyStringOrUndefined } from "~/utils/type";
import { ActionArgs, LoaderArgs } from "@remix-run/node";

export const loader = async ({ request, params }: LoaderArgs) => {
  const userId = await getUserId(request);
  const { workId, count } = extractParams(params, ["workId", "count"]);
  const episode = await db.episode.findUnique({
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
  const histories = await db.watchedEpisodesOnUser.findMany({
    where: {
      workId: parseInt(workId, 10),
      count: parseInt(count, 10),
    },
  });
  if (episode === null) {
    throw Error("episode not found");
  }
  return {
    userId,
    histories: histories.map((h) => ({
      ...h,
      createdAt: h.createdAt.getTime(),
    })),
    episode,
  };
};

export const action = async ({ request, params }: ActionArgs) => {
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
    await db.watchedEpisodesOnUser.delete({
      where: { userId_workId_count: { userId, workId, count } },
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

  await db.episode.update({
    where: {
      workId_count: {
        workId,
        count,
      },
    },
    data: {
      WatchedEpisodesOnUser: {
        create: {
          userId,
          comment,
          rating: _rating === undefined ? undefined : rating,
          createdAt: new Date(),
        },
      },
    },
  });
  return null;
};

export default function Episode() {
  const { userId, histories, episode } = useLoaderData<typeof loader>();
  const myHistory = userId && histories.find((w) => w.userId === userId);
  const otherHistories = histories.filter((h) => h.userId !== userId);

  return (
    <div>
      <h3>{episode.count}話</h3>
      <dl>
        <dt>放送日時</dt>
        <dd>{new Date(episode.publishedAt).toLocaleString()}</dd>
        <dt>タイトル</dt>
        <dd>
          <p>{episode.title}</p>
        </dd>
        <dt>あらすじ</dt>
        <dd>
          <p>{episode.description}</p>
        </dd>
        {myHistory && (
          <>
            <dt>視聴日時</dt>
            <dd>{new Date(myHistory.createdAt).toLocaleString()}</dd>
          </>
        )}
      </dl>
      {myHistory && (
        <section className="mt-4">
          <h4>あなたの感想</h4>
          <div className="flex">
            <div>{myHistory.rating}点</div>
            <p className="ml-4">{myHistory.comment}</p>
          </div>
        </section>
      )}
      {otherHistories.length > 0 && (
        <section className="mt-4">
          <h4>他の視聴者の感想</h4>
          <ul>
            {otherHistories.map((w) => {
              return (
                <li key={w.comment}>
                  <div className="flex">
                    <div>{w.rating}点</div>
                    <p className="ml-4">{w.comment}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
