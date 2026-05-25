import type { WatchRepository } from "~/domain/watch/repository";
import type { AppError, Result } from "~/utils/result";
import { Ok } from "~/utils/result";

type UnsubscribeWorkResult = { successMessage: string };

export const unsubscribeWork =
  (repos: { watchRepo: WatchRepository }) =>
  async (
    userId: string,
    workId: number,
  ): Promise<Result<UnsubscribeWorkResult, AppError>> => {
    const result = await repos.watchRepo.unsubscribe(userId, workId);
    if (result.err) return result;

    return Ok({
      successMessage: "unsubscribed",
    });
  };
