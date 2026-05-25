import type { Temporal } from "temporal-polyfill";
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
import type { WatchRepository } from "~/domain/watch/repository";
import {
  getQuarterEachLocaleDateStringFromTemporal,
  zdt2Date,
} from "~/utils/date";

export const getQuarterMetrics = (deps: {
  watchRepo: WatchRepository;
  metricsRepo: MetricsRepository;
  userId: string;
  now: Temporal.ZonedDateTime;
}) => {
  return async () => {
    const { watchRepo, metricsRepo, userId, now } = deps;

    const quarterStart = zdt2Date(
      cour2startZonedDateTime(zonedDateTime2cour(now)),
    );
    const quarterWatchStart = zdt2Date(
      cour2startZonedDateTime(zonedDateTime2cour(now)).add({ hours: 4 }),
    );
    const until = zdt2Date(now);

    const [quarterWatchAchievementDates, quarterDutyDates] = await Promise.all([
      watchRepo.findWatchAchievementDates(userId, quarterWatchStart),
      metricsRepo.findQuarterDuties(userId, quarterStart, until),
    ]);

    const quarterWatchAchievements = countOccurrence(
      quarterWatchAchievementDates.map((w) => getAnimeDate(w.createdAt)),
    );
    const quarterDuties = countOccurrence(
      quarterDutyDates.map((e) => getAnimeDate(e.publishedAt)),
    );

    const quarterKeys = getQuarterEachLocaleDateStringFromTemporal(now);
    const merged = mergeWeekMetrics(
      quarterKeys,
      quarterWatchAchievements,
      quarterDuties,
    );
    return computeCumulativeMetrics(merged);
  };
};
