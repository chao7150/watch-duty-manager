import type { Prisma } from "@prisma/client";

import type { AppError, Result } from "~/utils/result";
import type { EpisodeInput } from "./types";

export interface EpisodeRepository {
  createMany(
    data: EpisodeInput[],
  ): Promise<Result<{ count: number }, AppError>>;

  deleteAndReorder(
    workId: number,
    count: number,
  ): Promise<Result<void, AppError>>;

  findOldestPublishedAt(): Promise<Date>;

  groupByWorkIdWithCount(
    where: Prisma.EpisodeWhereInput,
    havingCount: number,
  ): Promise<number[]>;
}
