import type { Prisma } from "@prisma/client";

export interface MetricsRepository {
  findWeekDuties(
    userId: string,
    since: Date,
    until: Date,
  ): Promise<{ publishedAt: Date }[]>;

  findQuarterDuties(
    userId: string,
    since: Date,
    until: Date,
  ): Promise<{ publishedAt: Date }[]>;

  findQuarterWatchAchievements(
    userId: string,
    since: Date,
    until: Date,
  ): Promise<{ createdAt: Date }[]>;

  findEpisodeRatingDistribution(
    userId: string,
    episodeWhere?: Prisma.EpisodeWhereInput,
  ): Promise<{ rating: number | null; _count: { rating: number } }[]>;
}
