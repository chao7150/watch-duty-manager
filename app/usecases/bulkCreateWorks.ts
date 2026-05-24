import type { EpisodeRepository } from "~/domain/episode/repository";
import type { WorkRepository } from "~/domain/work/repository";
import type { BulkWorkInput } from "~/domain/work/types";
import type { AppError, Result } from "~/utils/result";
import { Err, Ok } from "~/utils/result";

type BulkCreateResult = {
  action: "bulkCreate";
  workCount: number;
  episodeCount: number;
};

export const bulkCreateWorks =
  (repos: { workRepo: WorkRepository; episodeRepo: EpisodeRepository }) =>
  async (
    insertingWorks: BulkWorkInput[],
  ): Promise<Result<BulkCreateResult, AppError>> => {
    if (insertingWorks.length === 0) {
      return Err({
        type: "validation",
        message: "登録しようとしている作品が0件です",
      });
    }

    const insertResult = await repos.workRepo.createMany(
      insertingWorks.map(({ episodeCount: _, ...rest }) => rest),
    );
    if (insertResult.err) {
      if (insertResult.err.type === "unique_constraint") {
        const existingWorksResult = await repos.workRepo.findManyByTitle(
          insertingWorks.map((w) => w.title),
        );
        if (existingWorksResult.err) return existingWorksResult;
        return Err({
          type: "unique_constraint",
          duplicatedFields: existingWorksResult.ok.map((w) => w.title),
        });
      }
      return insertResult;
    }

    const insertedWorksResult = await repos.workRepo.findManyByTitle(
      insertingWorks.map((w) => w.title),
    );
    if (insertedWorksResult.err) return insertedWorksResult;
    const insertedWorks = insertedWorksResult.ok;

    const episodeData = insertingWorks.flatMap((work) => {
      const insertedWork = insertedWorks.find((w) => w.title === work.title);
      if (!insertedWork) return [];
      return Array.from({ length: work.episodeCount }, (_, index) => ({
        workId: insertedWork.id,
        count: index + 1,
        publishedAt: new Date(
          work.publishedAt.getTime() + 1000 * 60 * 60 * 24 * 7 * index,
        ),
      }));
    });

    const episodeResult = await repos.episodeRepo.createMany(episodeData);
    if (episodeResult.err) return episodeResult;

    return Ok({
      action: "bulkCreate" as const,
      workCount: insertedWorks.length,
      episodeCount: episodeResult.ok.count,
    });
  };
