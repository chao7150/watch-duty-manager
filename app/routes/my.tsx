import { WatchedEpisodesOnUser, Work } from "@prisma/client";
import { DataFunctionArgs } from "@remix-run/server-runtime";
import { Form, useFetcher, useLoaderData } from "remix";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

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
  const fetcher = useFetcher();
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
              <p>{e.episode.work.title}</p>
              <p>{e.count}</p>
              <p>{new Date(e.createdAt).toLocaleString()}</p>
              <fetcher.Form
                action={`/works/${e.workId}/${e.count}?index`}
                method="post"
              >
                <button type="submit" name="_action" value="unwatch">
                  unwatch
                </button>
              </fetcher.Form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
