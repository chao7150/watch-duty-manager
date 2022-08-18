import { type DataFunctionArgs } from "@remix-run/server-runtime";
import { type MetaFunction, useLoaderData } from "remix";
import "firebase/compat/auth";
import { getUserId } from "~/utils/session.server";
import { db } from "~/utils/db.server";
import { Episode as EpisodeType, PrismaClient } from "@prisma/client";
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
import { useEffect } from "react";
import { addHours, startOfQuarter, subDays, subHours } from "date-fns";
import { sequenceT } from "fp-ts/lib/Apply";
import { task as T } from "fp-ts";
import { addDays } from "date-fns";
import { startOf4OriginDay } from "~/utils/date";

type LoaderData = {
  userId: string | null;
  tickets:
    | (EpisodeType & {
        work: { title: string; hashtag: string | null };
      })[];
  weekMetrics: {
    date: string;
    watchAchievements: number;
    dutyAccumulation: number;
  }[];
  quarterMetrics: {
    date: string;
    watchAchievements: number;
    dutyAccumulation: number;
  }[];
};

/**
 * targetMsが日本標準時の日付で表すと現在から何日前かを返す
 */
export const getNormalizedDate = (nowMs: number, targetMs: number) => {
  const JPUnixToday = Math.floor((nowMs + 18000000) / 86400000);
  const JPUnixDate = Math.floor((targetMs + 18000000) / 86400000);
  return JPUnixDate - JPUnixToday;
};

export const countOccurrence = (items: Array<string>): Map<string, number> => {
  return items.reduce((acc, val) => {
    const v = acc.get(val);
    if (v === undefined) {
      return acc.set(val, 1);
    }
    return acc.set(val, v + 1);
  }, new Map<string, number>());
};

const getTickets =
  ({
    db,
    userId,
    publishedUntilDate,
  }: {
    db: PrismaClient;
    userId: string;
    publishedUntilDate: Date;
  }) =>
  async () => {
    try {
      return await db.episode.findMany({
        where: {
          work: { users: { some: { userId } } },
          WatchedEpisodesOnUser: { none: { userId } },
          publishedAt: {
            lte: publishedUntilDate,
          },
        },
        include: { work: { select: { title: true, hashtag: true } } },
        orderBy: { publishedAt: "desc" },
      });
    } catch (e) {
      console.log(e);
      return [];
    }
  };

const getWeekWatchAchievements =
  ({ db, userId, now }: { db: PrismaClient; userId: string; now: Date }) =>
  async () => {
    const occurrence = (
      await db.watchedEpisodesOnUser.findMany({
        select: { createdAt: true },
        where: {
          userId,
          createdAt: {
            gte: subDays(startOf4OriginDay(now), 7),
          },
        },
      })
    ).map((w) => subHours(w.createdAt, 4).toLocaleDateString());
    return countOccurrence(occurrence);
  };

const getWeekDutyAccumulation =
  ({ db, userId, now }: { db: PrismaClient; userId: string; now: Date }) =>
  async () => {
    const occurrence = (
      await db.episode.findMany({
        select: { publishedAt: true },
        where: {
          work: { users: { some: { userId } } },
          publishedAt: {
            gte: subDays(startOf4OriginDay(now), 7),
            lte: now,
          },
        },
      })
    ).map((d) => subHours(d.publishedAt, 4).toLocaleDateString());
    return countOccurrence(occurrence);
  };

const getQuarterDuties =
  ({ db, userId, now }: { db: PrismaClient; userId: string; now: Date }) =>
  async () => {
    const occurrence = (
      await db.episode.findMany({
        select: { publishedAt: true },
        where: {
          work: { users: { some: { userId } } },
          publishedAt: { gte: addHours(startOfQuarter(now), 4), lte: now },
        },
      })
    ).map((e) => subHours(e.publishedAt, 4).toLocaleDateString());
    return countOccurrence(occurrence);
  };

const getQuarterWatchAchievements =
  ({ db, userId, now }: { db: PrismaClient; userId: string; now: Date }) =>
  async () => {
    const occurrence = (
      await db.watchedEpisodesOnUser.findMany({
        select: { createdAt: true },
        where: {
          episode: {
            publishedAt: {
              gte: addHours(startOfQuarter(now), 4),
              lte: now,
            },
            work: { users: { some: { userId } } },
          },
          userId,
        },
      })
    ).map((w) => subHours(w.createdAt, 4).toLocaleDateString());
    return countOccurrence(occurrence);
  };

export const loader = async ({
  request,
}: DataFunctionArgs): Promise<LoaderData> => {
  const userId = await getUserId(request);
  if (userId === null) {
    return {
      userId,
      tickets: [],
      weekMetrics: [],
      quarterMetrics: [],
    };
  }
  const now = new Date();
  const [
    tickets,
    weekWatchAchievements,
    weekDutyAccumulation,
    quarterDuties,
    quarterWatchAchievements,
  ] = await sequenceT(T.ApplyPar)(
    getTickets({ db, userId, publishedUntilDate: addDays(now, 1) }),
    getWeekWatchAchievements({ db, userId, now }),
    getWeekDutyAccumulation({ db, userId, now }),
    getQuarterDuties({ db, userId, now }),
    getQuarterWatchAchievements({ db, userId, now })
  )();
  const weekKeys = new Set([
    ...weekDutyAccumulation.keys(),
    ...weekWatchAchievements.keys(),
  ]);
  const mergedWeekMetricsMap = new Map<
    string,
    { watchAchievements: number; dutyAccumulation: number }
  >();
  weekKeys.forEach((k) => {
    mergedWeekMetricsMap.set(k, {
      watchAchievements: weekWatchAchievements.get(k) ?? 0,
      dutyAccumulation: weekDutyAccumulation.get(k) ?? 0,
    });
  });
  const weekMetrics = Object.entries(Object.fromEntries(mergedWeekMetricsMap))
    .map(([k, v]) => ({
      date: k,
      ...v,
    }))
    .sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const quarterKeys = new Set([
    ...quarterDuties.keys(),
    ...quarterWatchAchievements.keys(),
  ]);
  const mergedQuarterMetricsMap = new Map<
    string,
    { watchAchievements: number; dutyAccumulation: number }
  >();
  quarterKeys.forEach((k) => {
    mergedQuarterMetricsMap.set(k, {
      watchAchievements: quarterWatchAchievements.get(k) ?? 0,
      dutyAccumulation: quarterDuties.get(k) ?? 0,
    });
  });
  const quarterMetrics = Object.entries(
    Object.fromEntries(mergedQuarterMetricsMap)
  )
    .sort(([k1, _v1], [k2, _v2]) => {
      return new Date(k1).getTime() - new Date(k2).getTime();
    })
    .map(([k, v]) => {
      return {
        date: k,
        ...v,
      };
    })
    .reduce((acc, val) => {
      if (acc.length === 0) {
        return [val];
      }
      const last = acc[acc.length - 1];
      return [
        ...acc,
        {
          date: val.date,
          watchAchievements: last.watchAchievements + val.watchAchievements,
          dutyAccumulation: last.dutyAccumulation + val.dutyAccumulation,
        },
      ];
    }, [] as Array<{ date: string; watchAchievements: number; dutyAccumulation: number }>);

  return {
    userId,
    tickets,
    weekMetrics,
    quarterMetrics,
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
  const { userId, tickets, weekMetrics, quarterMetrics } =
    useLoaderData<Serialized<LoaderData>>();

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
          <LineChart data={weekMetrics}>
            <CartesianGrid />
            <XAxis dataKey="date" />
            <YAxis tickCount={3} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="watchAchievements" />
            <Line type="monotone" stroke="red" dataKey="dutyAccumulation" />
          </LineChart>
        </ResponsiveContainer>
        <ResponsiveContainer height={300}>
          <LineChart data={quarterMetrics}>
            <CartesianGrid />
            <XAxis dataKey="date" />
            <YAxis tickCount={5} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="watchAchievements" />
            <Line type="monotone" stroke="red" dataKey="dutyAccumulation" />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  ) : (
    <div>not logged in</div>
  );
}
