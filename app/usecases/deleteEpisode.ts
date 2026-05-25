import type { EpisodeRepository } from "~/domain/episode/repository";
import type { AppError, Result } from "~/utils/result";
import { Ok } from "~/utils/result";

type DeleteEpisodeResult = { successMessage: string };

export const deleteEpisode =
  (repos: { episodeRepo: EpisodeRepository }) =>
  async (
    workId: number,
    count: number,
  ): Promise<Result<DeleteEpisodeResult, AppError>> => {
    const result = await repos.episodeRepo.deleteAndReorder(workId, count);
    if (result.err) return result;

    return Ok({
      successMessage: "episode deleted",
    });
  };
