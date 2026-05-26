import type { Cour } from "~/domain/cour/consts";
import { cour2expression, cour2symbol, getCourList } from "~/domain/cour/util";
import type { EpisodeRepository } from "~/domain/episode/repository";
import type { WorkRepository } from "~/domain/work/repository";

export interface WorksListItem {
  id: number;
  title: string;
  subscribed: boolean;
}

export interface WorksListResult {
  works: WorksListItem[];
  courList: [string, string][];
  selectedCourDate: string | null;
  minEpisodes: number;
}

export const getWorksList =
  (deps: { episodeRepo: EpisodeRepository; workRepo: WorkRepository }) =>
  async (params: {
    userId: string | null;
    cour: Cour | null;
    minEpisodes: number;
  }): Promise<WorksListResult> => {
    const { episodeRepo, workRepo } = deps;
    const { userId, cour, minEpisodes } = params;

    const workIds = await episodeRepo.findWorkIdsWithMinEpisodes(
      cour,
      minEpisodes,
    );

    const works = await workRepo.findManyByIds(workIds, {
      includeUsers: userId !== null ? { userId } : undefined,
    });

    const oldestPublishedAt = await episodeRepo.findOldestPublishedAt();
    const cours = getCourList(oldestPublishedAt);

    return {
      works: works.map((w) => ({
        id: w.id,
        title: w.title,
        subscribed: (w.users?.length ?? 0) === 1,
      })),
      courList: cours.map(
        (c) => [cour2expression(c), cour2symbol(c)] as [string, string],
      ),
      selectedCourDate: cour ? cour2symbol(cour) : null,
      minEpisodes,
    };
  };
