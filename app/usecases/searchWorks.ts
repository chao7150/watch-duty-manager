import type { Cour } from "~/domain/cour/consts";
import type { EpisodeRepository } from "~/domain/episode/repository";
import type { WorkRepository } from "~/domain/work/repository";
import type { WorksListItem } from "./_shared/worksDto";

export interface SearchWorksResult {
  currentCourWorks: WorksListItem[];
  otherCourWorks: WorksListItem[];
}

export const searchWorks =
  (deps: { episodeRepo: EpisodeRepository; workRepo: WorkRepository }) =>
  async (params: {
    userId: string | null;
    cour: Cour | null;
    minEpisodes: number;
    query: string;
  }): Promise<SearchWorksResult> => {
    const { episodeRepo, workRepo } = deps;
    const { userId, cour, minEpisodes, query } = params;

    const currentCourWorkIds = await episodeRepo.findWorkIdsWithMinEpisodes(
      cour,
      minEpisodes,
    );

    // 全作品を取得
    const allWorks = await workRepo.findAll();

    // 部分一致フィルタ
    const normalizedQuery = query.toLowerCase().trim();
    const matched = allWorks.filter((w) =>
      w.title.toLowerCase().includes(normalizedQuery),
    );

    if (matched.length === 0) {
      return {
        currentCourWorks: [],
        otherCourWorks: [],
      };
    }

    // マッチした作品の詳細・購読情報を取得
    const matchedIds = matched.map((w) => w.id);
    const detailedWorks = await workRepo.findManyByIds(matchedIds, {
      includeUsers: userId !== null ? { userId } : undefined,
    });

    const currentCourWorkIdsSet = new Set(currentCourWorkIds);
    const currentCourWorks: WorksListItem[] = [];
    const otherCourWorks: WorksListItem[] = [];

    for (const w of detailedWorks) {
      const item: WorksListItem = {
        id: w.id,
        title: w.title,
        subscribed: (w.users?.length ?? 0) === 1,
      };
      if (currentCourWorkIdsSet.has(w.id)) {
        currentCourWorks.push(item);
      } else {
        otherCourWorks.push(item);
      }
    }

    return {
      currentCourWorks,
      otherCourWorks,
    };
  };
