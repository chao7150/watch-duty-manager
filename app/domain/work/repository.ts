import type { AppError, Result } from "~/utils/result";
import type {
  WorkDetail,
  WorkInput,
  WorkListItem,
  WorkTitleRecord,
  WorkUpdateInput,
} from "./types";

export interface WorkRepository {
  findById(
    id: number,
    options: {
      includeEpisodes?: boolean;
      includeEpisodeStatusOnUser?: { userId: string };
      includeUsers?: { userId: string };
    },
  ): Promise<WorkDetail | null>;

  findManyByIds(
    ids: number[],
    options: {
      includeUsers?: { userId: string };
    },
  ): Promise<WorkListItem[]>;

  findManyByTitle(
    titles: string[],
  ): Promise<Result<WorkTitleRecord[], AppError>>;

  create(data: WorkInput): Promise<Result<{ id: number }, AppError>>;

  createMany(
    data: Omit<WorkInput, "episodeCount">[],
  ): Promise<Result<void, AppError>>;

  update(
    id: number,
    data: WorkUpdateInput,
  ): Promise<Result<{ title: string }, AppError>>;

  count(): Promise<number>;
}
