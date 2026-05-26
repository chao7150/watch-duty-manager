import { Temporal } from "temporal-polyfill";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MetricsRepository } from "~/domain/metrics/repository";
import type { WatchRepository } from "~/domain/watch/repository";
import { getDashboard } from "~/usecases/getDashboard";

const FIXED_NOW = Temporal.ZonedDateTime.from({
  year: 2024,
  month: 1,
  day: 15,
  hour: 12,
  minute: 0,
  second: 0,
  millisecond: 0,
  timeZone: "Asia/Tokyo",
});

const makeMockWatchRepo = (): WatchRepository => ({
  findSubscribedWorks: vi.fn(),
  findUnwatchedEpisodes: vi.fn(),
  findWatchAchievementDates: vi.fn(),
  findRecentWatchAchievements: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  updateWatchSettings: vi.fn(),
  findSubscription: vi.fn(),
});

const makeMockMetricsRepo = (): MetricsRepository => ({
  findWeekDuties: vi.fn(),
  findQuarterDuties: vi.fn(),
  findQuarterWatchAchievements: vi.fn(),
  findEpisodeRatingDistribution: vi.fn(),
});

const dummyEpisode = (workId: number, count: number, daysAgo: number) => ({
  workId,
  count,
  publishedAt: new Date(FIXED_NOW.epochMilliseconds - daysAgo * 86400 * 1000),
  work: {
    title: `作品${workId}`,
    durationMin: 24,
    hashtag: null,
    officialSiteUrl: null,
  },
});

const dummyDate = (daysAgo: number) => ({
  createdAt: new Date(FIXED_NOW.epochMilliseconds - daysAgo * 86400 * 1000),
});

const dummyDuty = (daysAgo: number) => ({
  publishedAt: new Date(FIXED_NOW.epochMilliseconds - daysAgo * 86400 * 1000),
});

describe("getDashboard", () => {
  beforeEach(() => {
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(FIXED_NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常系: 購読情報と未視聴エピソードから正しくダッシュボードデータを構築する", async () => {
    const watchRepo = makeMockWatchRepo();
    const metricsRepo = makeMockMetricsRepo();

    vi.mocked(watchRepo.findSubscribedWorks).mockResolvedValue([
      { workId: 1, watchDelaySecFromPublish: 0, watchUrl: null },
      {
        workId: 2,
        watchDelaySecFromPublish: 86400,
        watchUrl: "https://example.com",
      },
    ]);

    vi.mocked(watchRepo.findUnwatchedEpisodes).mockResolvedValue([
      dummyEpisode(1, 1, 5),
      dummyEpisode(1, 2, 3),
      dummyEpisode(2, 1, 2),
    ]);

    vi.mocked(watchRepo.findWatchAchievementDates).mockResolvedValue([
      dummyDate(3),
      dummyDate(2),
      dummyDate(1),
    ]);

    vi.mocked(metricsRepo.findWeekDuties).mockResolvedValue([
      dummyDuty(4),
      dummyDuty(2),
    ]);

    vi.mocked(watchRepo.findRecentWatchAchievements).mockResolvedValue([
      {
        workId: 1,
        count: 1,
        createdAt: new Date(FIXED_NOW.epochMilliseconds - 3600 * 1000),
        episode: {
          count: 1,
          workId: 1,
          work: { title: "作品1", durationMin: 24, officialSiteUrl: null },
        },
      },
    ]);

    vi.mocked(metricsRepo.findQuarterDuties).mockResolvedValue([
      dummyDuty(10),
      dummyDuty(5),
    ]);

    const result = await getDashboard({
      watchRepo,
      metricsRepo,
      userId: "test-user",
    })();

    expect(result.userId).toBe("test-user");
    expect(result.tickets).toHaveLength(3);
    expect(result.weekMetrics.length).toBeGreaterThan(0);
    expect(result.quarterMetrics.length).toBeGreaterThan(0);
    expect(result.recentWatchAchievements).toHaveLength(1);
    expect(result.nowMs).toBe(FIXED_NOW.epochMilliseconds);
    expect(result.subscription.length).toBeGreaterThan(0);
  });

  it("購読作品がない場合でも空の状態で正常に返る", async () => {
    const watchRepo = makeMockWatchRepo();
    const metricsRepo = makeMockMetricsRepo();

    vi.mocked(watchRepo.findSubscribedWorks).mockResolvedValue([]);
    vi.mocked(watchRepo.findUnwatchedEpisodes).mockResolvedValue([]);
    vi.mocked(watchRepo.findWatchAchievementDates).mockResolvedValue([]);
    vi.mocked(metricsRepo.findWeekDuties).mockResolvedValue([]);
    vi.mocked(watchRepo.findRecentWatchAchievements).mockResolvedValue([]);
    vi.mocked(metricsRepo.findQuarterDuties).mockResolvedValue([]);

    const result = await getDashboard({
      watchRepo,
      metricsRepo,
      userId: "test-user",
    })();

    expect(result.userId).toBe("test-user");
    expect(result.tickets).toStrictEqual([]);
    expect(result.recentWatchAchievements).toStrictEqual([]);
    expect(result.subscription).toStrictEqual([]);
  });

  it("チケット計算において視聴遅延設定が反映される", async () => {
    const watchRepo = makeMockWatchRepo();
    const metricsRepo = makeMockMetricsRepo();

    vi.mocked(watchRepo.findSubscribedWorks).mockResolvedValue([
      { workId: 1, watchDelaySecFromPublish: 86400 * 7, watchUrl: null },
    ]);

    vi.mocked(watchRepo.findUnwatchedEpisodes).mockResolvedValue([
      dummyEpisode(1, 1, 3),
      dummyEpisode(1, 2, 10),
    ]);

    vi.mocked(watchRepo.findWatchAchievementDates).mockResolvedValue([]);
    vi.mocked(metricsRepo.findWeekDuties).mockResolvedValue([]);
    vi.mocked(watchRepo.findRecentWatchAchievements).mockResolvedValue([]);
    vi.mocked(metricsRepo.findQuarterDuties).mockResolvedValue([]);

    const result = await getDashboard({
      watchRepo,
      metricsRepo,
      userId: "test-user",
    })();

    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0].count).toBe(2);
  });
});
