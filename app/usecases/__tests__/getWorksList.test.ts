import { describe, expect, it, vi } from "vitest";
import type { EpisodeRepository } from "~/domain/episode/repository";
import type { WorkRepository } from "~/domain/work/repository";
import type { WorkListItem } from "~/domain/work/types";
import { getWorksList } from "~/usecases/getWorksList";

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

describe("getWorksList", () => {
  it("正常系: 指定した条件の作品一覧を取得し、購読状態を正しく反映する", async () => {
    const episodeRepo = makeMockEpisodeRepo();
    const workRepo = makeMockWorkRepo();

    vi.mocked(episodeRepo.findWorkIdsWithMinEpisodes).mockResolvedValue([1, 2]);
    vi.mocked(workRepo.findManyByIds).mockResolvedValue([
      dummyWorkListItem(1, "作品A", true),
      dummyWorkListItem(2, "作品B", false),
    ]);

    const result = await getWorksList({ episodeRepo, workRepo })({
      userId: "user-123",
      cour: { year: 2026, season: "spring" },
      minEpisodes: 3,
    });

    expect(episodeRepo.findWorkIdsWithMinEpisodes).toHaveBeenCalledWith(
      { year: 2026, season: "spring" },
      3,
    );
    expect(workRepo.findManyByIds).toHaveBeenCalledWith([1, 2], {
      includeUsers: { userId: "user-123" },
    });
    expect(result).toStrictEqual([
      { id: 1, title: "作品A", subscribed: true },
      { id: 2, title: "作品B", subscribed: false },
    ]);
  });

  it("未ログイン時: subscribed がすべて false になること", async () => {
    const episodeRepo = makeMockEpisodeRepo();
    const workRepo = makeMockWorkRepo();

    vi.mocked(episodeRepo.findWorkIdsWithMinEpisodes).mockResolvedValue([1]);
    vi.mocked(workRepo.findManyByIds).mockResolvedValue([
      dummyWorkListItem(1, "作品A", false),
    ]);

    const result = await getWorksList({ episodeRepo, workRepo })({
      userId: null,
      cour: { year: 2026, season: "spring" },
      minEpisodes: 3,
    });

    expect(workRepo.findManyByIds).toHaveBeenCalledWith([1], {
      includeUsers: undefined,
    });
    expect(result).toStrictEqual([
      { id: 1, title: "作品A", subscribed: false },
    ]);
  });
});
