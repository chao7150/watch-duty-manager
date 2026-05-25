import { Temporal } from "temporal-polyfill";
import {
  cour2startZonedDateTime,
  zonedDateTime2cour,
} from "~/domain/cour/util";
import { getAnimeDate } from "~/domain/date/util";
import {
  computeCumulativeMetrics,
  countOccurrence,
  mergeWeekMetrics,
} from "~/domain/metrics/compute";
import type { MetricsRepository } from "~/domain/metrics/repository";
import { computeTickets } from "~/domain/ticket/compute";
import type { WatchRepository } from "~/domain/watch/repository";
import {
  getPast7DaysLocaleDateStringFromTemporal,
  getQuarterEachLocaleDateStringFromTemporal,
  startOf4OriginDayFromTemporal,
  zdt2Date,
} from "~/utils/date";

export const getDashboard = (deps: {
  watchRepo: WatchRepository;
  metricsRepo: MetricsRepository;
  userId: string;
}) => {
  return async () => {
    const { watchRepo, metricsRepo, userId } = deps;
    const now = Temporal.Now.zonedDateTimeISO("Asia/Tokyo");

    const subscription = await watchRepo.findSubscribedWorks(userId);
    const subscribedWorks = subscription.map((s) => ({
      workId: s.workId,
      watchDelaySecFromPublish: s.watchDelaySecFromPublish ?? 0,
    }));

    const longestNegativeDelaySec = Math.min(
      0,
      ...subscribedWorks.map((s) => s.watchDelaySecFromPublish),
    );
    const publishedUntil = zdt2Date(
      now.add({ days: 1 }).subtract({ seconds: longestNegativeDelaySec }),
    );
    const weekStart = zdt2Date(
      startOf4OriginDayFromTemporal(now).subtract({ days: 7 }),
    );
    const weekEnd = zdt2Date(now);
    const quarterStart = zdt2Date(
      cour2startZonedDateTime(zonedDateTime2cour(now)),
    );
    const quarterWatchStart = zdt2Date(
      cour2startZonedDateTime(zonedDateTime2cour(now)).add({ hours: 4 }),
    );

    const [
      rawEpisodes,
      weekWatchAchievementDates,
      weekDutyDates,
      recentWatchAchievements,
      quarterWatchAchievementDates,
      quarterDutyDates,
    ] = await Promise.all([
      watchRepo.findUnwatchedEpisodes(
        userId,
        subscribedWorks.map((s) => s.workId),
        publishedUntil,
      ),
      watchRepo.findWatchAchievementDates(userId, weekStart),
      metricsRepo.findWeekDuties(userId, weekStart, weekEnd),
      watchRepo.findRecentWatchAchievements(userId, 10),
      watchRepo.findWatchAchievementDates(userId, quarterWatchStart),
      metricsRepo.findQuarterDuties(userId, quarterStart, weekEnd),
    ]);

    const tickets = computeTickets(now, subscribedWorks, rawEpisodes);
    const weekWatchAchievements = countOccurrence(
      weekWatchAchievementDates.map((w) => getAnimeDate(w.createdAt)),
    );
    const weekDutyAccumulation = countOccurrence(
      weekDutyDates.map((d) => getAnimeDate(d.publishedAt)),
    );
    const quarterWatchAchievements = countOccurrence(
      quarterWatchAchievementDates.map((w) => getAnimeDate(w.createdAt)),
    );
    const quarterDuties = countOccurrence(
      quarterDutyDates.map((e) => getAnimeDate(e.publishedAt)),
    );

    const weekKeys = getPast7DaysLocaleDateStringFromTemporal(now);
    const weekMetrics = mergeWeekMetrics(
      weekKeys,
      weekWatchAchievements,
      weekDutyAccumulation,
    );

    const quarterKeys = getQuarterEachLocaleDateStringFromTemporal(now);
    const quarterMerged = mergeWeekMetrics(
      quarterKeys,
      quarterWatchAchievements,
      quarterDuties,
    );
    const quarterMetrics = computeCumulativeMetrics(quarterMerged);

    return {
      userId,
      tickets,
      weekMetrics,
      quarterMetrics,
      recentWatchAchievements,
      nowMs: now.epochMilliseconds,
      subscription: tickets.reduce(
        (acc, val) => {
          const workId = val.workId;
          const s = subscription.find((s) => s.workId === workId);
          if (s === undefined) {
            return acc;
          }
          acc.push(s);
          return acc;
        },
        [] as typeof subscription,
      ),
    };
  };
};
