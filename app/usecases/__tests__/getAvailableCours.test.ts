import { describe, expect, it, vi } from "vitest";
import type { EpisodeRepository } from "~/domain/episode/repository";
import { getAvailableCours } from "~/usecases/getAvailableCours";

const makeMockEpisodeRepo = (oldestDate: Date | null) => {
  const episodeRepo: EpisodeRepository = {
    createMany: vi.fn(),
    deleteAndReorder: vi.fn(),
    findOldestPublishedAt: vi.fn().mockResolvedValue(oldestDate),
    groupByWorkIdWithCount: vi.fn(),
    findWorkIdsWithMinEpisodes: vi.fn(),
  };
  return episodeRepo;
};

describe("getAvailableCours", () => {
  it("正常系: 最古の公開日時から現在日時までのクール一覧が正しく取得できる", async () => {
    // 2025-01-15 (2025年冬クール) を最古とし、現在時刻を 2026-05-29 (2026年春クール) とする
    const oldestDate = new Date("2025-01-15T12:00:00+09:00");
    const mockRepo = makeMockEpisodeRepo(oldestDate);
    const now = new Date("2026-05-29T10:00:00+09:00");

    const result = await getAvailableCours({ episodeRepo: mockRepo })(now);

    expect(mockRepo.findOldestPublishedAt).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([
      ["2025冬", "2025winter"],
      ["2025春", "2025spring"],
      ["2025夏", "2025summer"],
      ["2025秋", "2025autumn"],
      ["2026冬", "2026winter"],
      ["2026春", "2026spring"],
    ]);
  });

  it("正常系: 最古の公開日時と現在日時が同じクール内の場合、1つのクールのみ返却する", async () => {
    // 2026-04-10 (2026年春クール) を最古とし、現在時刻を 2026-05-29 (2026年春クール) とする
    const oldestDate = new Date("2026-04-10T09:00:00+09:00");
    const mockRepo = makeMockEpisodeRepo(oldestDate);
    const now = new Date("2026-05-29T10:00:00+09:00");

    const result = await getAvailableCours({ episodeRepo: mockRepo })(now);

    expect(mockRepo.findOldestPublishedAt).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([["2026春", "2026spring"]]);
  });
});
