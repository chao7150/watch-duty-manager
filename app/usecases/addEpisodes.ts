import type { EpisodeRepository } from "~/domain/episode/repository";
import type { EpisodeInput } from "~/domain/episode/types";
import type { AppError, Result } from "~/utils/result";
import { Ok } from "~/utils/result";

type AddEpisodesResult = { successMessage: string };

export const addEpisodes =
  (repos: { episodeRepo: EpisodeRepository }) =>
  async (
    episodes: EpisodeInput[],
  ): Promise<Result<AddEpisodesResult, AppError>> => {
    const result = await repos.episodeRepo.createMany(episodes);
    if (result.err) return result;

    return Ok({
      successMessage: "episodes added",
    });
  };
