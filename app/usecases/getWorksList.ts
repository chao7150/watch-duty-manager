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
  searchedWorks?: {
    currentCourWorks: WorksListItem[];
    otherCourWorks: WorksListItem[];
  };
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
    query?: string;
  }): Promise<WorksListResult> => {
    const { episodeRepo, workRepo } = deps;
    const { userId, cour, minEpisodes, query } = params;

    // クエリが指定されている場合は検索モード
    if (query !== undefined && query.trim() !== "") {
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
        const oldestPublishedAt = await episodeRepo.findOldestPublishedAt();
        const cours = getCourList(oldestPublishedAt);
        return {
          works: [],
          searchedWorks: {
            currentCourWorks: [],
            otherCourWorks: [],
          },
          courList: cours.map(
            (c) => [cour2expression(c), cour2symbol(c)] as [string, string],
          ),
          selectedCourDate: cour ? cour2symbol(cour) : null,
          minEpisodes,
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

      const oldestPublishedAt = await episodeRepo.findOldestPublishedAt();
      const cours = getCourList(oldestPublishedAt);

      return {
        works: [],
        searchedWorks: {
          currentCourWorks,
          otherCourWorks,
        },
        courList: cours.map(
          (c) => [cour2expression(c), cour2symbol(c)] as [string, string],
        ),
        selectedCourDate: cour ? cour2symbol(cour) : null,
        minEpisodes,
      };
    }

    // 通常の読み込みモード
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
