import { type DataFunctionArgs } from "@remix-run/server-runtime";
import { type MetaFunction, useLoaderData } from "remix";
import "firebase/compat/auth";
import { getUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import { Episode as EpisodeType } from "@prisma/client";
import * as EpisodeList from "../components/Episode/List";
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
import { useEffect, useState } from "react";
import { startOfQuarter } from "date-fns";

type LoaderData = {
  userId: string | null;
  tickets: (EpisodeType & {
    work: { title: string; hashtag: string | null };
  })[];
  watchAchievements: { [K: number]: number };
  dutyAccumulation: { [K: number]: number };
  quarter: { [K: string]: { duty: number; watch: number } };
};

/**
 * targetMsが日本標準時の日付で表すと現在から何日前かを返す
 */
export const getNormalizedDate = (nowMs: number, targetMs: number) => {
  const JPUnixToday = Math.floor((nowMs + 18000000) / 86400000);
  const JPUnixDate = Math.floor((targetMs + 18000000) / 86400000);
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
      quarter: {},
    };
  }
  const tickets = await db.episode.findMany({
    where: {
      work: { users: { some: { userId } } },
      WatchedEpisodesOnUser: { none: { userId } },
      publishedAt: {
        lte: new Date(new Date().getTime() + 1000 * 60 * 60 * 24),
      },
    },
    include: { work: { select: { title: true, hashtag: true } } },
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
  const quarterDuties = await db.episode.findMany({
    where: {
      work: {
        users: { some: { userId } },
      },
      publishedAt: {
        gte: new Date(
          startOfQuarter(new Date()).getTime() + 1000 * 60 * 60 * 4
        ),
        lte: new Date(),
      },
    },
  });
  const _quarterWatchAchievements = await db.watchedEpisodesOnUser.findMany({
    where: {
      episode: {
        publishedAt: {
          gte: new Date(
            startOfQuarter(new Date()).getTime() + 1000 * 60 * 60 * 4
          ),
          lte: new Date(),
        },
        work: { users: { some: { userId } } },
      },
      userId,
    },
  });
  const quarterWatchAchievements = _quarterWatchAchievements.reduce(
    (acc, val) => {
      const index = new Date(
        val.createdAt.getTime() - 1000 * 60 * 60 * 4
      ).toLocaleDateString();
      if (acc.has(index)) {
        return acc.set(index, acc.get(index)! + 1);
      }
      return acc.set(index, 1);
    },
    new Map<string, number>()
  );
  const quarterDutyAccumulation = quarterDuties.reduce((acc, val) => {
    const index = new Date(
      val.publishedAt.getTime() - 1000 * 60 * 60 * 4
    ).toLocaleDateString();
    if (acc.has(index)) {
      return acc.set(index, acc.get(index)! + 1);
    }
    return acc.set(index, 1);
  }, new Map<string, number>());
  const quarter = new Map<string, { duty: number; watch: number }>();
  quarterDutyAccumulation.forEach((v, k) => {
    quarter.set(k, { duty: v, watch: 0 });
  });
  quarterWatchAchievements.forEach((v, k) => {
    if (quarter.has(k)) {
      quarter.set(k, { duty: quarter.get(k)!.duty, watch: v });
    } else {
      quarter.set(k, { duty: 0, watch: v });
    }
  });
  return {
    userId,
    tickets,
    watchAchievements: Object.fromEntries(watchAchievements),
    dutyAccumulation: Object.fromEntries(dutyAccumulation),
    quarter: Object.fromEntries(quarter),
  };
};

// https://remix.run/api/conventions#meta
export const meta: MetaFunction = () => {
  return {
    title: "Watch duty manager",
    description: "Welcome to remix!",
  };
};

export const setOldestOfWork = <T extends { workId: number }>(
  tickets: T[]
): Array<T & { watchReady: boolean }> => {
  const s = new Set<number>();
  return tickets
    .reverse()
    .map((t) => {
      if (s.has(t.workId)) {
        return { ...t, watchReady: false };
      }
      s.add(t.workId);
      return { ...t, watchReady: true };
    })
    .reverse();
};

// https://remix.run/guides/routing#index-routes
export default function Index() {
  useEffect(() => {
    const timerId = setInterval(() => {
      window.location.reload();
    }, 1000 * 60 * 5);
    return () => clearInterval(timerId);
  });
  const { userId, tickets, watchAchievements, dutyAccumulation, quarter } =
    useLoaderData<Serialized<LoaderData>>();

  const q = Object.entries(quarter)
    .map(([v, k]) => ({ ...k, date: v }))
    .sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  const currentSum = { duty: 0, watch: 0 };
  const qq: Array<{ date: string; duty: number; watch: number }> = [];
  q.forEach((c) => {
    qq.push({
      date: c.date,
      duty: c.duty + currentSum.duty,
      watch: c.watch + currentSum.watch,
    });
    currentSum.duty = c.duty + currentSum.duty;
    currentSum.watch = c.watch + currentSum.watch;
  });

  return userId ? (
    <div className="remix__page">
      <section>
        <h2>
          未視聴のエピソード
          <span>
            (
            {
              tickets.filter((ticket) => {
                return new Date(ticket.publishedAt) < new Date();
              }).length
            }
            )
          </span>
        </h2>
        <EpisodeList.Component
          episodes={setOldestOfWork([...tickets]).map((ticket) => {
            return {
              workId: ticket.workId,
              title: ticket.work.title,
              count: ticket.count,
              publishedAt: ticket.publishedAt,
              hashtag: ticket.work.hashtag ?? undefined,
              watchReady: ticket.watchReady,
            };
          })}
        />
      </section>
      <section>
        <h2>最近のアニメ放送数と視聴数の推移</h2>
        <ResponsiveContainer height={300}>
          <LineChart
            data={Array.from({ length: 8 }).map((_, index) => ({
              date: new Date(
                Date.now() + 86400000 * (index - 7) - 1000 * 3600 * 4 // 4時~28時
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
        <ResponsiveContainer height={300}>
          <LineChart data={qq}>
            <CartesianGrid />
            <XAxis dataKey="date" />
            <YAxis tickCount={5} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="watch" />
            <Line type="monotone" stroke="red" dataKey="duty" />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  ) : (
    <div>not logged in</div>
  );
}
