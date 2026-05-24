import type { PrismaClient } from "@prisma/client";
import type { MetricsRepository } from "~/domain/metrics/repository";

export const createMetricsRepository = (
  db: PrismaClient,
): MetricsRepository => ({
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

  findEpisodeRatingDistribution: async (userId, episodeWhere) => {
    const rows = await db.episodeStatusOnUser.groupBy({
      by: ["rating"],
      where: {
        userId,
        status: "watched",
        episode: episodeWhere ?? {},
      },
      _count: { rating: true },
    });
    return rows;
  },
});
