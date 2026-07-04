import type { WatchRepository } from "~/domain/watch/repository";
import type { AppError, Result } from "~/utils/result";
import { Err, Ok } from "~/utils/result";

type BulkWatchResult = { successMessage: string };

export const bulkWatchEpisodes =
  (repos: { watchRepo: WatchRepository }) =>
  async (
    userId: string,
    workId: number,
    untilCount: number,
    publishedUntil: Date,
  ): Promise<Result<BulkWatchResult, AppError>> => {
    if (!Number.isInteger(untilCount) || untilCount < 1) {
      return Err({
        type: "validation" as const,
        message: "指定した話数が不正です",
      });
    }

    const targetCounts = await repos.watchRepo.findUnwatchedEpisodeCounts(
      userId,
      workId,
      { untilCount, publishedUntil },
    );

    if (targetCounts.length === 0) {
      return Ok({
        successMessage: "登録対象のエピソードがありません",
      });
    }

    const result = await repos.watchRepo.createWatchedStatuses(
      userId,
      workId,
      targetCounts,
    );

    if (result.err) return result;

    return Ok({
      successMessage: `${targetCounts.length}話分を視聴登録しました`,
    });
  };
