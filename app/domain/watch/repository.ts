import type { AppError, Result } from "~/utils/result";
import type {
  SubscribedWorkSummary,
  TicketEpisode,
  WatchAchievement,
} from "./types";

export interface WatchRepository {
  /**
   * 指定話数以下・公開済みで、かつユーザーが未登録（watched/skipped いずれもなし）のエピソード話数を取得
   */
  findUnwatchedEpisodeCounts(
    userId: string,
    workId: number,
    params: { untilCount: number; publishedUntil: Date },
  ): Promise<number[]>;

  /**
   * 指定話数のエピソードを watched で一括登録（skipDuplicates で既存レコードは上書きしない）
   */
  createWatchedStatuses(
    userId: string,
    workId: number,
    counts: number[],
  ): Promise<Result<void, AppError>>;

  findSubscribedWorks(userId: string): Promise<SubscribedWorkSummary[]>;

  findSubscribedWorksWithEpisodeStatus(
    userId: string,
    workIds: number[],
  ): Promise<
    {
      id: number;
      title: string;
      episodes: {
        count: number;
        publishedAt: Date;
        status: { rating: number | null; createdAt: Date } | null;
      }[];
    }[]
  >;

  findUnwatchedEpisodes(
    userId: string,
    workIds: number[],
    publishedUntil: Date,
  ): Promise<TicketEpisode[]>;

  findWatchAchievementDates(
    userId: string,
    since: Date,
  ): Promise<{ createdAt: Date }[]>;

  findRecentWatchAchievements(
    userId: string,
    take: number,
  ): Promise<WatchAchievement[]>;

  subscribe(userId: string, workId: number): Promise<Result<void, AppError>>;

  unsubscribe(userId: string, workId: number): Promise<Result<void, AppError>>;

  updateWatchSettings(
    userId: string,
    workId: number,
    data: {
      watchDelaySecFromPublish?: number | null;
      watchUrl?: string | null;
    },
  ): Promise<Result<void, AppError>>;

  findSubscription(
    userId: string,
    workId: number,
  ): Promise<SubscribedWorkSummary | null>;
}
