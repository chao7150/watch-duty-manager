import { DataFunctionArgs } from "@remix-run/server-runtime";
import { MetaFunction, useFetcher } from "remix";
import { useLoaderData } from "remix";
import "firebase/compat/auth";
import { getUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import { Episode as EpisodeType } from "@prisma/client";
import * as Episode from "../components/Episode";
import { Serialized } from "~/utils/type";

type LoaderData = {
  userId: string | null;
  tickets: (EpisodeType & {
    work: { title: string };
  })[];
};

export const loader = async ({
  request,
}: DataFunctionArgs): Promise<LoaderData> => {
  const userId = await getUserId(request);
  if (userId === null) {
    return {
      userId,
      tickets: [],
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
    tickets,
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
  const { userId, tickets } = useLoaderData<Serialized<LoaderData>>();
  const fetcher = useFetcher();

  return userId ? (
    <div className="remix__page">
      <section>
        <h2>未視聴のエピソード</h2>
        <ul>
          {tickets.map((ticket) => {
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
