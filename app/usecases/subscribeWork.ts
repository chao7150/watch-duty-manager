import type { WatchRepository } from "~/domain/watch/repository";
import type { AppError, Result } from "~/utils/result";
import { Ok } from "~/utils/result";

type SubscribeWorkResult = { successMessage: string };

export const subscribeWork =
  (repos: { watchRepo: WatchRepository }) =>
  async (
    userId: string,
    workId: number,
  ): Promise<Result<SubscribeWorkResult, AppError>> => {
    const result = await repos.watchRepo.subscribe(userId, workId);
    if (result.err) return result;

    return Ok({
      successMessage: "subscribed",
    });
  };
