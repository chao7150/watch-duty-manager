import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useRevalidator } from "@remix-run/react";

import { useInterval } from "react-use";

import type { PrismaClient } from "@prisma/client";
import "firebase/compat/auth";
import * as A from "fp-ts/lib/Apply.js";
import * as T from "fp-ts/lib/Task.js";
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
import { Temporal } from "temporal-polyfill";

import {
  cour2startZonedDateTime,
  zonedDateTime2cour,
} from "~/domain/cour/util";

import * as EpisodeList from "~/components/Episode/List";

import {
  date2ZonedDateTime,
  formatZDT,
  getPast7DaysLocaleDateStringFromTemporal,
  getQuarterEachLocaleDateStringFromTemporal,
  startOf4OriginDayFromTemporal,
  zdt2Date,
} from "~/utils/date";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";
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

/**
 * Prisma から取得した Date オブジェクトを Temporal.ZonedDateTime に変換し、
 * 4時間引いてフォーマットした文字列を返します。
 * 
 * @param prismaDate - Prisma から取得した Date オブジェクト
 * @returns yyyy/MM/dd 形式の文字列
 */
const prismaDate2key = (prismaDate: Date): string => {
  const date = date2ZonedDateTime(prismaDate).subtract({ hours: 4 });
  return formatZDT(date);
};

const getTickets =
  ({
    db,
    userId,
    publishedUntilDate,
  }: {
    db: PrismaClient;
    userId: string;
    publishedUntilDate: Temporal.ZonedDateTime;
  }) =>
  async () => {
    try {
      return await db.episode.findMany({
        where: {
          work: { users: { some: { userId } } },
          WatchedEpisodesOnUser: { none: { userId } },
          publishedAt: {
            lte: zdt2Date(publishedUntilDate),
          },
        },
        include: {
          work: {
            include: {
              users: {
                where: { userId },
              },
            },
          },
        },
        orderBy: { publishedAt: "desc" },
      });
    } catch (e) {
      console.log(e);
      return [];
    }
  };

const getWeekWatchAchievements =
  ({
    db,
    userId,
    now,
  }: {
    db: PrismaClient;
    userId: string;
    now: Temporal.ZonedDateTime;
  }) =>
  async () => {
    const startDay = zdt2Date(
      startOf4OriginDayFromTemporal(now).subtract({ days: 7 }),
    );
    const occurrence = (
      await db.watchedEpisodesOnUser.findMany({
        select: { createdAt: true },
        where: {
          userId,
          createdAt: {
            gte: startDay,
          },
        },
      })
    ).map((w) => prismaDate2key(w.createdAt));
    return countOccurrence(occurrence);
  };

const getWeekDutyAccumulation =
  ({
    db,
    userId,
    now,
  }: {
    db: PrismaClient;
    userId: string;
    now: Temporal.ZonedDateTime;
  }) =>
  async () => {
    const dateNow = zdt2Date(now);
    const startDay = zdt2Date(
      startOf4OriginDayFromTemporal(now).subtract({ days: 7 }),
    );
    const occurrence = (
      await db.episode.findMany({
        select: { publishedAt: true },
        where: {
          work: { users: { some: { userId } } },
          publishedAt: {
            gte: startDay,
            lte: dateNow,
          },
        },
      })
    ).map((d) => prismaDate2key(d.publishedAt));
    return countOccurrence(occurrence);
  };

const getQuarterDuties =
  ({
    db,
    userId,
    now,
  }: {
    db: PrismaClient;
    userId: string;
    now: Temporal.ZonedDateTime;
  }) =>
  async () => {
    const dateNow = zdt2Date(now);
    const startDate = zdt2Date(
      cour2startZonedDateTime(zonedDateTime2cour(now)),
    );
    const occurrence = (
      await db.episode.findMany({
        select: { publishedAt: true },
        where: {
          work: { users: { some: { userId } } },
          publishedAt: { gte: startDate, lte: dateNow },
        },
      })
    ).map((e) => prismaDate2key(e.publishedAt));
    return countOccurrence(occurrence);
  };

const getQuarterWatchAchievements =
  ({
    db,
    userId,
    now,
  }: {
    db: PrismaClient;
    userId: string;
    now: Temporal.ZonedDateTime;
  }) =>
  async () => {
    const dateNow = zdt2Date(now);
    const startDate = zdt2Date(
      cour2startZonedDateTime(zonedDateTime2cour(now)).add({ hours: 4 }),
    );
    const occurrence = (
      await db.watchedEpisodesOnUser.findMany({
        select: { createdAt: true },
        where: {
          episode: {
            publishedAt: {
              gte: startDate,
              lte: dateNow,
            },
            work: { users: { some: { userId } } },
          },
          userId,
        },
      })
    ).map((w) => prismaDate2key(w.createdAt));
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
          include: {
            work: {
              include: {
                users: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });
  };

export const getQuarterMetrics =
  ({
    db,
    now,
    userId,
  }: {
    db: PrismaClient;
    now: Temporal.ZonedDateTime;
    userId: string;
  }) =>
  async (): Promise<
    { date: string; watchAchievements: number; dutyAccumulation: number }[]
  > => {
    const quarterWatchAchievements = await getQuarterWatchAchievements({
      db,
      userId,
      now,
    })();
    const quarterDuties = await getQuarterDuties({ db, userId, now })();
    const quarterKeys = getQuarterEachLocaleDateStringFromTemporal(now);
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
      .reduce(
        (acc, val) => {
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
        },
        [] as Array<{
          date: string;
          watchAchievements: number;
          dutyAccumulation: number;
        }>,
      );
  };

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
    10,
  );
  const now = Temporal.Now.zonedDateTimeISO("Asia/Tokyo");
  const [
    tickets,
    weekWatchAchievements,
    weekDutyAccumulation,
    recentWatchAchievements,
    quarterMetrics,
  ] = await A.sequenceT(T.ApplyPar)(
    getTickets({ db, userId, publishedUntilDate: now.add({ days: 1 }) }),
    getWeekWatchAchievements({ db, userId, now }),
    getWeekDutyAccumulation({ db, userId, now }),
    getRecentWatchAchievements({
      db,
      userId,
      take: recentWatchAchievementCount,
    }),
    getQuarterMetrics({ db, userId, now }),
  )();
  const weekKeys = getPast7DaysLocaleDateStringFromTemporal(now);
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
    Object.fromEntries(mergedWeekMetricsMap),
  ).map(([k, v]) => ({
    date: k,
    ...v,
  }));

  const workIds = new Set(tickets.map((t) => t.workId));
  const subscription = await db.subscribedWorksOnUser.findMany({
    where: { userId, workId: { in: Array.from(workIds) } },
    select: { watchDelaySecFromPublish: true, workId: true, watchUrl: true },
  });

  return {
    userId,
    tickets,
    weekMetrics,
    quarterMetrics,
    recentWatchAchievements,
    subscription,
  };
};

export const setOldestOfWork = <T extends { workId: number }>(
  tickets: T[],
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
  const revalidator = useRevalidator();
  useInterval(() => revalidator.revalidate(), 1000 * 60 * 15);
  const {
    userId,
    tickets,
    weekMetrics,
    quarterMetrics,
    recentWatchAchievements,
    subscription,
  } = useLoaderData<typeof loader>();
  const now = new Date();

  if (userId === null) {
    return (
      <div>
        <Link to="/login">ログイン</Link>してください。
      </div>
    );
  }

  const unwatchedTickets = tickets.filter((ticket) => {
    return new Date(ticket.publishedAt) < now;
  });

  return (
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
              officialSiteUrl: ticket.work.officialSiteUrl ?? "",
              watchUrl:
                subscription.find((s) => s.workId === ticket.workId)
                  ?.watchUrl ?? undefined,
            };
          })}
          workIdDelayMinList={subscription.map((d) => [
            d.workId,
            d.watchDelaySecFromPublish,
          ])}
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
            officialSiteUrl: a.episode.work.officialSiteUrl ?? "",
            watchUrl:
              subscription.find((s) => s.workId === a.workId)?.watchUrl ??
              undefined,
            published: true,
          }))}
          workIdDelayMinList={[]}
          useLocalStorage={false}
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
  );
}
