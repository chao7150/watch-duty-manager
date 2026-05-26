import { Temporal } from "temporal-polyfill";

import type { Cour } from "~/domain/cour/consts";
import {
  cour2expression,
  cour2startZonedDateTime,
  cour2symbol,
  getCourList,
  next,
} from "~/domain/cour/util";
import type { EpisodeRepository } from "~/domain/episode/repository";
import type { MetricsRepository } from "~/domain/metrics/repository";
import type { WatchRepository } from "~/domain/watch/repository";
import {
  computeWorkCompleteCount,
  computeWorkRating,
  computeWorkWatchedEpisodesDenominator,
} from "~/domain/work/_compute";
import { getQuarterMetrics } from "~/usecases/getQuarterMetrics";

export interface MyDashboardWork {
  id: number;
  title: string;
  rating: number;
  complete: number;
  watchedEpisodesDenominator: number;
  episodes: {
    count: number;
    publishedAt: Date;
    status: { rating: number | null; createdAt: Date } | null;
  }[];
}

export interface MyDashboardBestEpisode {
  rating: number;
  workId: number;
  count: number;
  comment: string | null;
  episode: {
    count: number;
    workId: number;
    work: {
      title: string;
    };
  };
}

export interface FilledEpisodeRatingDistribution {
  rating: number;
  count: number;
}

export interface MyDashboardResult {
  selectedCourDate: string | null;
  courList: [string, string][];
  minEpisodes: number;
  works: MyDashboardWork[];
  bestEpisodesOnUser: MyDashboardBestEpisode[];
  quarterMetrics: Array<{
    date: string;
    watchAchievements: number;
    dutyAccumulation: number;
  }>;
  filledEpisodeRatingDistribution: FilledEpisodeRatingDistribution[];
}

export const getMyDashboard =
  (deps: {
    episodeRepo: EpisodeRepository;
    watchRepo: WatchRepository;
    metricsRepo: MetricsRepository;
  }) =>
  async (params: {
    userId: string;
    cour: Cour | null;
    minEpisodes: number;
  }): Promise<MyDashboardResult> => {
    const { episodeRepo, watchRepo, metricsRepo } = deps;
    const { userId, cour, minEpisodes } = params;

    const watchingWorkIds = await episodeRepo.findWorkIdsWithMinEpisodes(
      cour,
      minEpisodes,
      {
        work: {
          users: { some: { userId } },
        },
      },
    );

    const watchingWorks = await watchRepo.findSubscribedWorksWithEpisodeStatus(
      userId,
      watchingWorkIds,
    );

    const [bestEpisodesOnUser, episodeRatingDistribution, oldestPublishedAt] =
      await Promise.all([
        metricsRepo.findBestEpisodes(userId, cour),
        metricsRepo.findEpisodeRatingDistribution(userId, cour),
        episodeRepo.findOldestPublishedAt(),
      ]);

    const now =
      cour === null
        ? Temporal.Now.zonedDateTimeISO("Asia/Tokyo")
        : cour2startZonedDateTime(next(cour)).subtract({ milliseconds: 1 });

    const quarterMetrics = await getQuarterMetrics({
      watchRepo,
      metricsRepo,
      userId,
      now,
    })();

    const filledEpisodeRatingDistribution: FilledEpisodeRatingDistribution[] =
      [];
    Array.from({ length: 11 }).forEach((_, i) => {
      filledEpisodeRatingDistribution.push({
        rating: i,
        count:
          episodeRatingDistribution.find((e) => e.rating === i)?._count
            .rating ?? 0,
      });
    });

    const cours = getCourList(oldestPublishedAt);

    return {
      selectedCourDate: cour ? cour2symbol(cour) : null,
      courList: cours.map(
        (c) => [cour2expression(c), cour2symbol(c)] as [string, string],
      ),
      minEpisodes,
      works: watchingWorks.map((work) => {
        const rating = computeWorkRating(work);
        const complete = computeWorkCompleteCount(work);
        const watchedEpisodesDenominator =
          computeWorkWatchedEpisodesDenominator(work, true);
        return {
          id: work.id,
          title: work.title,
          rating,
          complete,
          watchedEpisodesDenominator,
          episodes: work.episodes,
        };
      }),
      bestEpisodesOnUser: bestEpisodesOnUser.filter(
        (e): e is MyDashboardBestEpisode => e.rating !== null,
      ),
      quarterMetrics,
      filledEpisodeRatingDistribution,
    };
  };
