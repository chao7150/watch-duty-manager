import { describe, expect, it, vi } from "vitest";

import type { WatchRepository } from "~/domain/watch/repository";
import { editWatchSettings } from "~/usecases/editWatchSettings";
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
});

describe("editWatchSettings", () => {
  it("正常系: 視聴URLと放送遅延時間を更新しリポジトリが正しく呼ばれる", async () => {
    const watchRepo = makeMockWatchRepo();
    vi.mocked(watchRepo.updateWatchSettings).mockResolvedValue(Ok(undefined));

    const formData = new FormData();
    formData.set("days", "2");
    formData.set("hour_min", "03:00");
    formData.set("url", "https://example.com/watch");

    const result = await editWatchSettings({ watchRepo })("user1", 1, formData);

    expect(result).toStrictEqual({
      ok: { successMessage: "watch settings is successfully updated" },
    });
    expect(watchRepo.updateWatchSettings).toHaveBeenCalledWith("user1", 1, {
      watchDelaySecFromPublish: 2 * 86400 + 3 * 3600,
      watchUrl: "https://example.com/watch",
    });
  });

  it("正常系: 遅延時間0の場合はwatchDelaySecFromPublishがnullで渡される", async () => {
    const watchRepo = makeMockWatchRepo();
    vi.mocked(watchRepo.updateWatchSettings).mockResolvedValue(Ok(undefined));

    const formData = new FormData();
    formData.set("days", "0");
    formData.set("hour_min", "00:00");

    const result = await editWatchSettings({ watchRepo })("user1", 1, formData);

    expect(result).toStrictEqual({
      ok: { successMessage: "watch settings is successfully updated" },
    });
    expect(watchRepo.updateWatchSettings).toHaveBeenCalledWith("user1", 1, {
      watchDelaySecFromPublish: null,
      watchUrl: null,
    });
  });

  it("異常系: days が数値でない場合はバリデーションエラー", async () => {
    const watchRepo = makeMockWatchRepo();

    const formData = new FormData();
    formData.set("days", "abc");
    formData.set("hour_min", "03:00");

    const result = await editWatchSettings({ watchRepo })("user1", 1, formData);

    expect(result.err).toBeDefined();
    expect(result.err?.type).toBe("validation");
    expect(watchRepo.updateWatchSettings).not.toHaveBeenCalled();
  });

  it("異常系: hour_min の形式が不正な場合はバリデーションエラー", async () => {
    const watchRepo = makeMockWatchRepo();

    const formData = new FormData();
    formData.set("days", "1");
    formData.set("hour_min", "invalid");

    const result = await editWatchSettings({ watchRepo })("user1", 1, formData);

    expect(result.err).toBeDefined();
    expect(result.err?.type).toBe("validation");
    expect(watchRepo.updateWatchSettings).not.toHaveBeenCalled();
  });

  it("異常系: watchRepo.updateWatchSettings がエラーを返した場合、そのまま返る", async () => {
    const watchRepo = makeMockWatchRepo();
    vi.mocked(watchRepo.updateWatchSettings).mockResolvedValue(
      Err({ type: "not_found", resource: "subscription", id: 1 }),
    );

    const formData = new FormData();
    formData.set("days", "1");
    formData.set("hour_min", "00:00");

    const result = await editWatchSettings({ watchRepo })("user1", 1, formData);

    expect(result.err).toBeDefined();
    expect(result.err?.type).toBe("not_found");
  });
});
