import type { MetricsRepository } from "~/domain/metrics/repository";
import { db } from "~/utils/db.server";
import { generateEpisodeDateQuery } from "./query-helpers";

export const metricsRepository: MetricsRepository = {
  findWeekDuties: (userId, since, until) =>
    db.episode.findMany({
      select: { publishedAt: true },
      where: {
        work: { users: { some: { userId } } },
        publishedAt: { gte: since, lte: until },
      },
    }),

  findQuarterDuties: (userId, since, until) =>
    db.episode.findMany({
      select: { publishedAt: true },
      where: {
        work: { users: { some: { userId } } },
        publishedAt: { gte: since, lte: until },
      },
    }),

  findQuarterWatchAchievements: (userId, since, until) =>
    db.episodeStatusOnUser.findMany({
      select: { createdAt: true },
      where: {
        userId,
        status: "watched",
        episode: {
          publishedAt: { gte: since, lte: until },
          work: { users: { some: { userId } } },
        },
      },
    }),

  findEpisodeRatingDistribution: async (userId, cour) => {
    const rows = await db.episodeStatusOnUser.groupBy({
      by: ["rating"],
      where: {
        userId,
        status: "watched",
        episode: generateEpisodeDateQuery(cour),
      },
      _count: { rating: true },
    });
    return rows;
  },

  findBestEpisodes: (userId, cour, take = 30) =>
    db.episodeStatusOnUser.findMany({
      where: {
        userId,
        status: "watched",
        episode: generateEpisodeDateQuery(cour),
      },
      include: {
        episode: {
          include: {
            work: { select: { title: true } },
          },
        },
      },
      orderBy: { rating: "desc" },
      take,
    }),
};
