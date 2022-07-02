import { type DataFunctionArgs } from "@remix-run/server-runtime";
import { type MetaFunction, useLoaderData } from "remix";
import "firebase/compat/auth";
import { getUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import { Episode as EpisodeType } from "@prisma/client";
import * as Episode from "../components/Episode/Episode";
import { Serialized } from "~/utils/type";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type LoaderData = {
  userId: string | null;
  tickets: (EpisodeType & {
    work: { title: string };
  })[];
  watchAchievements: { [K: number]: number };
  dutyAccumulation: { [K: number]: number };
};

/**
 * targetMsが日本標準時の日付で表すと現在から何日前かを返す
 */
export const getNormalizedDate = (nowMs: number, targetMs: number) => {
  const JPUnixToday = Math.floor((nowMs + 32400000) / 86400000);
  const JPUnixDate = Math.floor((targetMs + 32400000) / 86400000);
  return JPUnixDate - JPUnixToday;
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
      dutyAccumulation: [],
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
          gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 8),
        },
      },
      orderBy: { createdAt: "desc" },
    })
  ).reduce((acc, val) => {
    const index = getNormalizedDate(Date.now(), val.createdAt.getTime()); // -8 ~ 0
    if (acc.has(index)) {
      return acc.set(index, acc.get(index)! + 1);
    }
    return acc.set(index, 1);
  }, new Map<number, number>());
  const dutyAccumulation = (
    await db.episode.findMany({
      where: {
        work: {
          users: { some: { userId } },
        },
        publishedAt: {
          gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 8),
          lte: new Date(),
        },
      },
    })
  ).reduce((acc, val) => {
    const index = getNormalizedDate(Date.now(), val.publishedAt.getTime());
    if (acc.has(index)) {
      return acc.set(index, acc.get(index)! + 1);
    }
    return acc.set(index, 1);
  }, new Map<number, number>());
  return {
    userId,
    tickets,
    watchAchievements: Object.fromEntries(watchAchievements),
    dutyAccumulation: Object.fromEntries(dutyAccumulation),
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
  const { userId, tickets, watchAchievements, dutyAccumulation } =
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
              date: new Date(
                Date.now() + 86400000 * (index - 7)
              ).toLocaleDateString(),
              watchAchievement: watchAchievements[index - 7] ?? 0,
              dutyAccumulation: dutyAccumulation[index - 7] ?? 0,
            }))}
          >
            <CartesianGrid />
            <XAxis dataKey="date" />
            <YAxis tickCount={3} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="watchAchievement" />
            <Line type="monotone" stroke="red" dataKey="dutyAccumulation" />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  ) : (
    <div>not logged in</div>
  );
}
