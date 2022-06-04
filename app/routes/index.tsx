import { DataFunctionArgs } from "@remix-run/server-runtime";
import { MetaFunction, useFetcher } from "remix";
import { useLoaderData } from "remix";
import "firebase/compat/auth";
import { getUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import { Episode as EpisodeType } from "@prisma/client";
import * as Episode from "../components/Episode/Episode";
import { Serialized } from "~/utils/type";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

type LoaderData = {
  userId: string | null;
  tickets: (EpisodeType & {
    work: { title: string };
  })[];
  watchAchievements: { [K: number]: number };
};

export const loader = async ({
  request,
}: DataFunctionArgs): Promise<LoaderData> => {
  const userId = await getUserId(request);
  if (userId === null) {
    return {
      userId,
      tickets: [],
      watchAchievements: [],
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
  const watchAchievements = (
    await db.watchedEpisodesOnUser.findMany({
      where: {
        userId,
        createdAt: {
          gt: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 8),
        },
      },
      orderBy: { createdAt: "desc" },
    })
  ).reduce((acc, val) => {
    const JPUnixToday = Math.floor(
      (new Date().getTime() + 32400000) / 86400000
    );
    const JPUnixDate = Math.floor(
      (val.createdAt.getTime() + 32400000) / 86400000
    );
    const index = JPUnixDate - JPUnixToday; // -7 ~ 0
    if (acc.has(index)) {
      return acc.set(index, acc.get(index)! + 1);
    }
    return acc.set(index, 1);
  }, new Map<number, number>());
  return {
    userId,
    tickets,
    watchAchievements: Object.fromEntries(watchAchievements),
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
  const { userId, tickets, watchAchievements } =
    useLoaderData<Serialized<LoaderData>>();

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
      <section>
        <ResponsiveContainer height={300}>
          <LineChart
            data={Array.from({ length: 8 }).map((_, index) => ({
              date: index - 7,
              watchAchievement: watchAchievements[index - 7],
            }))}
          >
            <CartesianGrid />
            <XAxis dataKey="date" />
            <YAxis />
            <Line type="monotone" dataKey="watchAchievement" />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  ) : (
    <div>not logged in</div>
  );
}
