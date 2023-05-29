import { LoaderArgs, V2_MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import "firebase/compat/auth";
import { PrismaClient } from "@prisma/client";
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
import { addDays, addHours, subDays, subHours } from "date-fns";
import * as A from "fp-ts/Apply";
import * as T from "fp-ts/Task";
import * as EpisodeList from "../components/Episode/List";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";
import {
  getPast7DaysLocaleDateString,
  getQuarterEachLocaleDateString,
  startOf4OriginDay,
} from "~/utils/date";
import { cour2startDate, date2cour } from "~/domain/cour/util";
import { parseSearchParamAsNumber } from "~/utils/validator";

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
        include: {
          work: { select: { title: true, hashtag: true, durationMin: true } },
        },
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
          publishedAt: { gte: cour2startDate(date2cour(now)), lte: now },
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
              gte: addHours(cour2startDate(date2cour(now)), 4),
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

const getRecentWatchAchievements =
  ({ db, userId, take }: { db: PrismaClient; userId: string; take: number }) =>
  async () => {
    return await db.watchedEpisodesOnUser.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        episode: {
          include: { work: { select: { title: true, durationMin: true } } },
        },
      },
    });
  };

export const getQuarterMetrics =
  ({ db, now, userId }: { db: PrismaClient; now: Date; userId: string }) =>
  async (): Promise<
    { date: string; watchAchievements: number; dutyAccumulation: number }[]
  > => {
    const quarterWatchAchievements = await getQuarterWatchAchievements({
      db,
      userId,
      now,
    })();
    const quarterDuties = await getQuarterDuties({ db, userId, now })();
    const quarterKeys = getQuarterEachLocaleDateString(now);
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
    return Object.entries(Object.fromEntries(mergedQuarterMetricsMap))
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
  };

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await getUserId(request);
  if (userId === null) {
    return {
      userId,
      tickets: [],
      weekMetrics: [],
      quarterMetrics: [],
      recentWatchAchievements: [],
    };
  }
  const recentWatchAchievementCount = parseSearchParamAsNumber(
    request.url,
    "recentWatchAchievementCount",
    10
  );
  const now = new Date();
  const [
    tickets,
    weekWatchAchievements,
    weekDutyAccumulation,
    recentWatchAchievements,
    quarterMetrics,
  ] = await A.sequenceT(T.ApplyPar)(
    getTickets({ db, userId, publishedUntilDate: addDays(now, 1) }),
    getWeekWatchAchievements({ db, userId, now }),
    getWeekDutyAccumulation({ db, userId, now }),
    getRecentWatchAchievements({
      db,
      userId,
      take: recentWatchAchievementCount,
    }),
    getQuarterMetrics({ db, userId, now })
  )();
  const weekKeys = getPast7DaysLocaleDateString(now);
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
  const weekMetrics = Object.entries(
    Object.fromEntries(mergedWeekMetricsMap)
  ).map(([k, v]) => ({
    date: k,
    ...v,
  }));

  return {
    userId,
    tickets,
    weekMetrics,
    quarterMetrics,
    recentWatchAchievements,
  };
};

// https://remix.run/api/conventions#meta
export const meta: V2_MetaFunction = ({}) => {
  return [
    { title: "Watch duty manager" },
    { description: "Just watch anime." },
  ];
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
    }, 1000 * 60 * 15);
    return () => clearInterval(timerId);
  });
  const {
    userId,
    tickets,
    weekMetrics,
    quarterMetrics,
    recentWatchAchievements,
  } = useLoaderData<typeof loader>();
  const now = new Date();
  const unwatchedTickets = tickets.filter((ticket) => {
    return new Date(ticket.publishedAt) < now;
  });

  return userId ? (
    <div className="remix__page">
      <section>
        <header className="flex gap-2 ">
          <h2>未視聴のエピソード</h2>
          <h3 className="flex gap-1 items-center text-text-weak text-base">
            <span>{unwatchedTickets.length}本</span>
            <span>
              {unwatchedTickets
                .map((ticket) => ticket.work.durationMin)
                .reduce((acc, val) => acc + val, 0)}
              分
            </span>
          </h3>
        </header>
        <EpisodeList.Component
          episodes={setOldestOfWork([...tickets]).map((ticket) => {
            return {
              workId: ticket.workId,
              title: ticket.work.title,
              durationMin: ticket.work.durationMin,
              count: ticket.count,
              publishedAt: ticket.publishedAt,
              hashtag: ticket.work.hashtag ?? undefined,
              watchReady: ticket.watchReady,
              watched: false,
            };
          })}
        />
      </section>
      <section>
        <h2>最近のアニメ放送数と視聴数の推移</h2>
        <ResponsiveContainer height={300}>
          <LineChart data={weekMetrics}>
            <CartesianGrid />
            <XAxis dataKey="date" stroke="#bdc1c6" />
            <YAxis tickCount={3} stroke="#bdc1c6" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="watchAchievements" />
            <Line type="monotone" stroke="red" dataKey="dutyAccumulation" />
          </LineChart>
        </ResponsiveContainer>
        <ResponsiveContainer height={300}>
          <LineChart data={quarterMetrics}>
            <CartesianGrid />
            <XAxis dataKey="date" stroke="#bdc1c6" />
            <YAxis tickCount={5} stroke="#bdc1c6" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="watchAchievements" />
            <Line type="monotone" stroke="red" dataKey="dutyAccumulation" />
          </LineChart>
        </ResponsiveContainer>
        <h2 className="mt-4">最近見たエピソード</h2>
        <EpisodeList.Component
          episodes={recentWatchAchievements.map((a) => ({
            workId: a.workId,
            title: a.episode.work.title,
            durationMin: a.episode.work.durationMin,
            count: a.count,
            publishedAt: a.createdAt,
            watched: true,
          }))}
        />
        <Link
          className="mt-2 py-2 flex flex-row justify-center hover:bg-accent-area"
          to={`/?recentWatchAchievementCount=${
            recentWatchAchievements.length + 10
          }`}
        >
          <span>もっと見る</span>
        </Link>
      </section>
    </div>
  ) : (
    <div>
      <Link to="/login">ログイン</Link>してください。
    </div>
  );
}
