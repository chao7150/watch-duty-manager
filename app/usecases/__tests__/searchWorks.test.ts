import { describe, expect, it, vi } from "vitest";
import type { EpisodeRepository } from "~/domain/episode/repository";
import type { WorkRepository } from "~/domain/work/repository";
import type { WorkListItem } from "~/domain/work/types";
import { searchWorks } from "~/usecases/searchWorks";

const makeMockEpisodeRepo = (): EpisodeRepository => ({
  createMany: vi.fn(),
  deleteAndReorder: vi.fn(),
  findOldestPublishedAt: vi.fn(),
  groupByWorkIdWithCount: vi.fn(),
  findWorkIdsWithMinEpisodes: vi.fn(),
});

const makeMockWorkRepo = (): WorkRepository => ({
  findById: vi.fn(),
  findManyByIds: vi.fn(),
  findManyByTitle: vi.fn(),
  create: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
  findAll: vi.fn(),
});

const dummyWorkListItem = (
  id: number,
  title: string,
  hasUser: boolean,
): WorkListItem => ({
  id,
  knowledgeNodeId: id,
  title,
  publishedAt: new Date(),
  durationMin: 24,
  officialSiteUrl: null,
  twitterId: null,
  hashtag: null,
  users: hasUser ? [{ userId: "user-123" }] : [],
});

describe("searchWorks", () => {
  it("正常系: タイトルの部分一致検索を行い、クール内・外に分類して返す", async () => {
    const episodeRepo = makeMockEpisodeRepo();
    const workRepo = makeMockWorkRepo();

    // 検索に一致しうる全作品データ
    vi.mocked(workRepo.findAll).mockResolvedValue([
      { id: 1, title: "境界戦機" },
      { id: 2, title: "戦国魔神" },
      { id: 3, title: "魔法少女マドカ" },
    ]);

    // クール内とみなされる作品ID
    vi.mocked(episodeRepo.findWorkIdsWithMinEpisodes).mockResolvedValue([1]);

    // findManyByIds は検索でマッチした 1, 2 についてのみ呼ばれるはず
    vi.mocked(workRepo.findManyByIds).mockResolvedValue([
      dummyWorkListItem(1, "境界戦機", true),
      dummyWorkListItem(2, "戦国魔神", false),
    ]);

    const result = await searchWorks({ episodeRepo, workRepo })({
      userId: "user-123",
      cour: { year: 2026, season: "spring" },
      minEpisodes: 3,
      query: "戦", // 「戦」で部分一致
    });

    expect(episodeRepo.findWorkIdsWithMinEpisodes).toHaveBeenCalledWith(
      { year: 2026, season: "spring" },
      3,
    );
    expect(workRepo.findAll).toHaveBeenCalledTimes(1);
    expect(workRepo.findManyByIds).toHaveBeenCalledWith([1, 2], {
      includeUsers: { userId: "user-123" },
    });

    expect(result).toStrictEqual({
      currentCourWorks: [{ id: 1, title: "境界戦機", subscribed: true }],
      otherCourWorks: [{ id: 2, title: "戦国魔神", subscribed: false }],
    });
  });

  it("該当作品なし: 検索クエリにマッチする作品がない場合、空配列を返す", async () => {
    const episodeRepo = makeMockEpisodeRepo();
    const workRepo = makeMockWorkRepo();

    vi.mocked(workRepo.findAll).mockResolvedValue([
      { id: 1, title: "境界戦機" },
    ]);

    const result = await searchWorks({ episodeRepo, workRepo })({
      userId: "user-123",
      cour: { year: 2026, season: "spring" },
      minEpisodes: 3,
      query: "無関係",
    });

    expect(workRepo.findManyByIds).not.toHaveBeenCalled();
    expect(result).toStrictEqual({
      currentCourWorks: [],
      otherCourWorks: [],
    });
  });
});
