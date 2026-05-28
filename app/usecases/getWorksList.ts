import type { Cour } from "~/domain/cour/consts";
import type { EpisodeRepository } from "~/domain/episode/repository";
import type { WorkRepository } from "~/domain/work/repository";

import type { WorksListItem } from "./_shared/worksDto";

export const getWorksList =
  (deps: { episodeRepo: EpisodeRepository; workRepo: WorkRepository }) =>
  async (params: {
    userId: string | null;
    cour: Cour | null;
    minEpisodes: number;
  }): Promise<WorksListItem[]> => {
    const { episodeRepo, workRepo } = deps;
    const { userId, cour, minEpisodes } = params;

    const workIds = await episodeRepo.findWorkIdsWithMinEpisodes(
      cour,
      minEpisodes,
    );

    const works = await workRepo.findManyByIds(workIds, {
      includeUsers: userId !== null ? { userId } : undefined,
    });

    return works.map((w) => ({
      id: w.id,
      title: w.title,
      subscribed: (w.users?.length ?? 0) === 1,
    }));
  };
