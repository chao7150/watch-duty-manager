import { describe, expect, it, vi } from "vitest";

import type { WatchRepository } from "~/domain/watch/repository";
import { bulkWatchEpisodes } from "~/usecases/bulkWatchEpisodes";
import { Err, Ok } from "~/utils/result";

const makeMockWatchRepo = (): WatchRepository => ({
  findSubscribedWorks: vi.fn(),
  findSubscribedWorksWithEpisodeStatus: vi.fn(),
  findUnwatchedEpisodes: vi.fn(),
  findWatchAchievementDates: vi.fn(),
  findRecentWatchAchievements: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  updateWatchSettings: vi.fn(),
  findSubscription: vi.fn(),
  findUnwatchedEpisodeCounts: vi.fn(),
  createWatchedStatuses: vi.fn(),
});

describe("bulkWatchEpisodes", () => {
  const testDate = new Date("2024-01-15T12:00:00Z");

  it("正常系: 未視聴のエピソードを一括登録する", async () => {
    const watchRepo = makeMockWatchRepo();
    vi.mocked(watchRepo.findUnwatchedEpisodeCounts).mockResolvedValue([
      1, 2, 3,
    ]);
    vi.mocked(watchRepo.createWatchedStatuses).mockResolvedValue(Ok(undefined));

    const result = await bulkWatchEpisodes({ watchRepo })(
      "user1",
      10,
      5,
      testDate,
    );

    expect(result).toStrictEqual({
      ok: { successMessage: "3話分を視聴登録しました" },
    });
    expect(watchRepo.findUnwatchedEpisodeCounts).toHaveBeenCalledWith(
      "user1",
      10,
      { untilCount: 5, publishedUntil: testDate },
    );
    expect(watchRepo.createWatchedStatuses).toHaveBeenCalledWith(
      "user1",
      10,
      [1, 2, 3],
    );
  });

  it("正常系: 登録対象がない場合は0件メッセージ", async () => {
    const watchRepo = makeMockWatchRepo();
    vi.mocked(watchRepo.findUnwatchedEpisodeCounts).mockResolvedValue([]);

    const result = await bulkWatchEpisodes({ watchRepo })(
      "user1",
      10,
      5,
      testDate,
    );

    expect(result).toStrictEqual({
      ok: { successMessage: "登録対象のエピソードがありません" },
    });
    expect(watchRepo.createWatchedStatuses).not.toHaveBeenCalled();
  });

  it("異常系: untilCount が不正な場合はバリデーションエラー", async () => {
    const watchRepo = makeMockWatchRepo();

    const result = await bulkWatchEpisodes({ watchRepo })(
      "user1",
      10,
      0,
      testDate,
    );

    expect(result.err).toBeDefined();
    expect(result.err?.type).toBe("validation");
    expect(watchRepo.findUnwatchedEpisodeCounts).not.toHaveBeenCalled();
  });

  it("異常系: createWatchedStatuses がエラーを返した場合、そのまま返る", async () => {
    const watchRepo = makeMockWatchRepo();
    vi.mocked(watchRepo.findUnwatchedEpisodeCounts).mockResolvedValue([1, 2]);
    vi.mocked(watchRepo.createWatchedStatuses).mockResolvedValue(
      Err({ type: "db", message: "failed" }),
    );

    const result = await bulkWatchEpisodes({ watchRepo })(
      "user1",
      10,
      5,
      testDate,
    );

    expect(result.err).toBeDefined();
    expect(result.err?.type).toBe("db");
  });
});
