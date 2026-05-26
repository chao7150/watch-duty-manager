import type { Cour } from "~/domain/cour/consts";

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
    cour: Cour | null,
  ): Promise<{ rating: number | null; _count: { rating: number } }[]>;

  findBestEpisodes(
    userId: string,
    cour: Cour | null,
    take?: number,
  ): Promise<
    {
      rating: number | null;
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
    }[]
  >;
}
