import type { EpisodeRepository } from "~/domain/episode/repository";
import type { WorkRepository } from "~/domain/work/repository";
import type { WorkInput } from "~/domain/work/types";
import type { AppError, Result } from "~/utils/result";
import { Err, Ok } from "~/utils/result";

type CreateWorkInput = {
  title: string;
  episodeDate: Date[];
  officialSiteUrl?: string | null;
  twitterId?: string | null;
  hashtag?: string | null;
  durationMin?: number;
};

type CreateWorkResult = { id: number };

export const createWork =
  (repos: { workRepo: WorkRepository; episodeRepo: EpisodeRepository }) =>
  async (
    input: CreateWorkInput,
  ): Promise<Result<CreateWorkResult, AppError>> => {
    const { episodeDate, ...rest } = input;
    const workData: WorkInput = {
      ...rest,
      publishedAt: episodeDate[0],
    };

    const createResult = await repos.workRepo.create(workData);
    if (createResult.err) return createResult;

    const episodeData = episodeDate.map((date, index) => ({
      workId: createResult.ok.id,
      count: index + 1,
      publishedAt: date,
    }));

    const episodeResult = await repos.episodeRepo.createMany(episodeData);
    if (episodeResult.err) {
      return Err({
        type: "db",
        message: "episode creation failed",
        cause: episodeResult.err,
      });
    }

    return Ok({ id: createResult.ok.id });
  };
