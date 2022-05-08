import { WatchedEpisodesOnUser, Work } from "@prisma/client";
import { DataFunctionArgs } from "@remix-run/server-runtime";
import { useLoaderData } from "remix";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import * as Episode from "../components/Episode";

type LoaderData = {
  subscribedWorks: Work[];
  recentWatchedEpisodes: (Omit<WatchedEpisodesOnUser, "createdAt"> & {
    createdAt: string;
    episode: { work: { title: string } };
  })[];
};
export const loader = async ({
  request,
}: DataFunctionArgs): Promise<LoaderData> => {
  const userId = await requireUserId(request);
  const subscribedWorks = await db.work.findMany({
    where: { users: { some: { userId } } },
  });
  const recentWatchedEpisodes = await db.watchedEpisodesOnUser.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { episode: { include: { work: { select: { title: true } } } } },
  });
  return {
    subscribedWorks,
    recentWatchedEpisodes: recentWatchedEpisodes.map((e) => {
      return { ...e, createdAt: e.createdAt.toISOString() };
    }),
  };
};

export default function My() {
  const { subscribedWorks, recentWatchedEpisodes } =
    useLoaderData<LoaderData>();

  return (
    <>
      <section>
        <h2>視聴中のアニメ</h2>
        <ul>
          {subscribedWorks.map((work) => (
            <li key={work.id}>{work.title}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>最近見たエピソード</h2>
        <ul>
          {recentWatchedEpisodes.map((e) => (
            <li key={`${e.workId}-${e.count}`}>
              <Episode.Component.Watched
                workId={e.workId}
                title={e.episode.work.title}
                count={e.count}
                publishedAt={e.createdAt}
                comment={e.comment ?? undefined}
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
