import { isNumber } from "~/utils/type";

import type { DashboardWork, DashboardWorkWithStats } from "./types";

export const computeWorkRating = (work: DashboardWork): number => {
  const ratings = work.episodes.map((e) => e.status?.rating).filter(isNumber);
  if (ratings.length === 0) {
    return 0;
  }
  return ratings.reduce((acc, val) => acc + val, 0) / ratings.length;
};

export const computeWorkCompleteCount = (work: DashboardWork): number => {
  return work.episodes.filter((e) => e.status !== null).length;
};

export const computeWorkWatchedEpisodesDenominator = (
  work: DashboardWork,
  byPublished: boolean,
): number => {
  if (byPublished) {
    const now = new Date();
    return work.episodes.filter((e) => new Date(e.publishedAt) < now).length;
  }
  return work.episodes.length;
};

export const enrichWorkWithStats = (
  work: DashboardWork,
  byPublished: boolean,
): DashboardWorkWithStats => {
  return {
    ...work,
    rating: computeWorkRating(work),
    completeCount: computeWorkCompleteCount(work),
    watchedEpisodesDenominator: computeWorkWatchedEpisodesDenominator(
      work,
      byPublished,
    ),
  };
};
