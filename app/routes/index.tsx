import { DataFunctionArgs } from "@remix-run/server-runtime";
import { MetaFunction, useFetcher } from "remix";
import { useLoaderData } from "remix";
import "firebase/compat/auth";
import { getUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import { Episode as EpisodeType } from "@prisma/client";
import * as Episode from "../components/Episode";

type IndexData = {
  userId: string | null;
  tickets?: (Omit<EpisodeType, "publishedAt"> & {
    publishedAt: string;
    work: { title: string };
  })[];
};

export const loader = async ({
  request,
}: DataFunctionArgs): Promise<IndexData> => {
  const userId = await getUserId(request);
  if (userId === null) {
    return {
      userId,
    };
  }
  const tickets = await db.episode.findMany({
    where: {
      AND: [
        { work: { users: { some: { userId } } } },
        { WatchedEpisodesOnUser: { none: { userId } } },
        {
          publishedAt: {
            lte: new Date(new Date().getTime() + 1000 * 60 * 60 * 24),
          },
        },
      ],
    },
    include: { work: { select: { title: true } } },
    orderBy: { publishedAt: "desc" },
  });
  return {
    userId,
    tickets: tickets.map((t) => ({
      ...t,
      publishedAt: t.publishedAt.toISOString(),
    })),
  };
};

// https://remix.run/api/conventions#meta
export const meta: MetaFunction = () => {
  return {
    title: "Watch duty manager",
    description: "Welcome to remix!",
  };
};

// https://remix.run/guides/routing#index-routes
export default function Index() {
  const { userId, tickets } = useLoaderData<IndexData>();
  const fetcher = useFetcher();

  return userId ? (
    <div className="remix__page">
      <section>
        <h2>未視聴のエピソード</h2>
        <ul>
          {tickets?.map((ticket) => {
            return (
              <li key={`${ticket.workId}-${ticket.count}`}>
                <Episode.Component.New
                  workId={ticket.workId}
                  title={ticket.work.title}
                  count={ticket.count}
                  publishedAt={ticket.publishedAt}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  ) : (
    <div>not logged in</div>
  );
}
