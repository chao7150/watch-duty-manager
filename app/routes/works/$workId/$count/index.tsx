import { DataFunctionArgs } from "@remix-run/server-runtime";
import { useLoaderData } from "remix";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { extractParams } from "~/utils/type";

type LoaderData = {
  workId: number;
  count: number;
  publishedAt: string;
  work: { title: string };
} | null;
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
    include: { work: { select: { title: true } } },
  });
  if (episode === null) {
    return null;
  }
  return { ...episode, publishedAt: episode?.publishedAt.toISOString() };
};

type ActionData = null;
export const action = async ({
  request,
  params,
}: DataFunctionArgs): Promise<ActionData> => {
  const userId = await requireUserId(request);
  const { workId, count } = extractParams(params, ["workId", "count"]);
  await db.episode.update({
    where: {
      workId_count: {
        workId: parseInt(workId, 10),
        count: parseInt(count, 10),
      },
    },
    data: { WatchedEpisodesOnUser: { create: { userId } } },
  });
  return null;
};

export default function Episode() {
  const episode = useLoaderData<LoaderData>();
  if (episode === null) {
    return <p>no data</p>;
  }

  return (
    <dl>
      <dt>作品名</dt>
      <dd>{episode.work.title}</dd>
      <dt>話数</dt>
      <dd>{episode.count}</dd>
      <dt>放送日時</dt>
      <dd>{new Date(episode.publishedAt).toLocaleString()}</dd>
    </dl>
  );
}
