import { Episode } from "@prisma/client";
import { type DataFunctionArgs } from "@remix-run/server-runtime";
import { useLoaderData } from "remix";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import {
  extractParams,
  nonEmptyStringOrUndefined,
  Serialized,
} from "~/utils/type";

type LoaderData = {
  episode: Episode & {
    work: { title: string };
    WatchedEpisodesOnUser: { comment: string | null; rating: number | null }[];
  };
};
export const loader = async ({
  params,
}: DataFunctionArgs): Promise<LoaderData> => {
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
      WatchedEpisodesOnUser: { select: { comment: true, rating: true } },
    },
  });
  if (episode === null) {
    throw Error("episode not found");
  }
  return {
    episode,
  };
};

type ActionData = null;
export const action = async ({
  request,
  params,
}: DataFunctionArgs): Promise<ActionData> => {
  const userId = await requireUserId(request);
  const { workId: _workId, count: _count } = extractParams(params, [
    "workId",
    "count",
  ]);
  const workId = parseInt(_workId, 10);
  const count = parseInt(_count, 10);

  const formData = Object.fromEntries(await request.formData());

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
  if (![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(rating)) {
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
  const { episode } = useLoaderData<Serialized<LoaderData>>();

  return (
    <div>
      <dl>
        <dt>作品名</dt>
        <dd>{episode.work.title}</dd>
        <dt>話数</dt>
        <dd>{episode.count}</dd>
        <dt>放送日時</dt>
        <dd>{new Date(episode.publishedAt).toLocaleString()}</dd>
      </dl>
      <ul>
        {episode.WatchedEpisodesOnUser.map((w) => {
          return (
            <li key={w.comment}>
              <p>{w.rating}点</p>
              <p>{w.comment}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
