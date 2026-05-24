import type { AppError, Result } from "~/utils/result";
import type {
  SubscribedWorkSummary,
  TicketEpisode,
  WatchAchievement,
} from "./types";

export interface WatchRepository {
  findSubscribedWorks(userId: string): Promise<SubscribedWorkSummary[]>;

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
