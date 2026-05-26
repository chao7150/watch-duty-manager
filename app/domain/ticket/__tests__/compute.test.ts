import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { computeTickets, setOldestOfWork } from "../compute";

const d = (s: string) => new Date(s);

describe("setOldestOfWork", () => {
  it("同一workIdの中で最もpublishedAtが古い話数のみwatchReady=true", () => {
    expect(
      setOldestOfWork([
        { workId: 1, publishedAt: d("2024-01-10T04:00:00+09:00"), count: 3 },
        { workId: 2, publishedAt: d("2024-01-05T04:00:00+09:00"), count: 10 },
        { workId: 1, publishedAt: d("2024-01-03T04:00:00+09:00"), count: 2 },
        { workId: 1, publishedAt: d("2024-01-01T04:00:00+09:00"), count: 1 },
      ]),
    ).toStrictEqual([
      {
        workId: 1,
        publishedAt: d("2024-01-10T04:00:00+09:00"),
        count: 3,
        watchReady: false,
      },
      {
        workId: 2,
        publishedAt: d("2024-01-05T04:00:00+09:00"),
        count: 10,
        watchReady: true,
      },
      {
        workId: 1,
        publishedAt: d("2024-01-03T04:00:00+09:00"),
        count: 2,
        watchReady: false,
      },
      {
        workId: 1,
        publishedAt: d("2024-01-01T04:00:00+09:00"),
        count: 1,
        watchReady: true,
      },
    ]);
  });

  it("入力順序に依存せずpublishedAtで判定する", () => {
    const ascending = [
      { workId: 1, publishedAt: d("2024-01-01T04:00:00+09:00") },
      { workId: 1, publishedAt: d("2024-01-10T04:00:00+09:00") },
    ];
    const descending = [...ascending].reverse();
    expect(setOldestOfWork(ascending)).toStrictEqual([
      {
        workId: 1,
        publishedAt: d("2024-01-01T04:00:00+09:00"),
        watchReady: true,
      },
      {
        workId: 1,
        publishedAt: d("2024-01-10T04:00:00+09:00"),
        watchReady: false,
      },
    ]);
    expect(setOldestOfWork(descending)).toStrictEqual([
      {
        workId: 1,
        publishedAt: d("2024-01-10T04:00:00+09:00"),
        watchReady: false,
      },
      {
        workId: 1,
        publishedAt: d("2024-01-01T04:00:00+09:00"),
        watchReady: true,
      },
    ]);
  });

  it("単一のworkIdはwatchReady=true", () => {
    expect(
      setOldestOfWork([
        { workId: 1, publishedAt: d("2024-01-01T04:00:00+09:00") },
      ]),
    ).toStrictEqual([
      {
        workId: 1,
        publishedAt: d("2024-01-01T04:00:00+09:00"),
        watchReady: true,
      },
    ]);
  });

  it("空配列は空配列を返す", () => {
    expect(setOldestOfWork([])).toStrictEqual([]);
  });

  it("元の配列順序を維持する", () => {
    const input = [
      { workId: 3, publishedAt: d("2024-01-01T04:00:00+09:00") },
      { workId: 1, publishedAt: d("2024-01-02T04:00:00+09:00") },
      { workId: 2, publishedAt: d("2024-01-03T04:00:00+09:00") },
      { workId: 1, publishedAt: d("2024-01-04T04:00:00+09:00") },
    ];
    const result = setOldestOfWork(input);
    expect(result.map((r) => r.workId)).toStrictEqual([3, 1, 2, 1]);
  });

  it("元の配列を変更しない（非破壊）", () => {
    const d1 = d("2024-01-01T04:00:00+09:00");
    const d2 = d("2024-01-02T04:00:00+09:00");
    const input = [
      { workId: 1, publishedAt: d1 },
      { workId: 2, publishedAt: d2 },
    ];
    setOldestOfWork(input);
    expect(input[0].publishedAt).toEqual(d1);
    expect(input[1].publishedAt).toEqual(d2);
  });
});

describe("computeTickets", () => {
  const now = Temporal.ZonedDateTime.from({
    year: 2024,
    month: 1,
    day: 15,
    hour: 12,
    minute: 0,
    second: 0,
    millisecond: 0,
    timeZone: "Asia/Tokyo",
  });

  it("公開日が現在時刻より前のエピソードのみをチケットとして返す", () => {
    const episodes = [
      {
        workId: 1,
        count: 1,
        publishedAt: d("2024-01-10T04:00:00+09:00"),
        work: {
          title: "A",
          durationMin: 24,
          hashtag: null,
          officialSiteUrl: null,
        },
      },
      {
        workId: 1,
        count: 2,
        publishedAt: d("2024-01-20T04:00:00+09:00"),
        work: {
          title: "A",
          durationMin: 24,
          hashtag: null,
          officialSiteUrl: null,
        },
      },
    ];
    const subscribedWorks = [{ workId: 1, watchDelaySecFromPublish: 0 }];
    expect(computeTickets(now, subscribedWorks, episodes)).toStrictEqual([
      episodes[0],
    ]);
  });

  it("視聴遅延設定（watchDelaySecFromPublish）が正しく適用される", () => {
    const episodes = [
      {
        workId: 1,
        count: 1,
        publishedAt: d("2024-01-14T12:00:00+09:00"),
        work: {
          title: "A",
          durationMin: 24,
          hashtag: null,
          officialSiteUrl: null,
        },
      },
      {
        workId: 1,
        count: 2,
        publishedAt: d("2024-01-14T12:00:00+09:00"),
        work: {
          title: "A",
          durationMin: 24,
          hashtag: null,
          officialSiteUrl: null,
        },
      },
    ];
    const subscribedWorks = [{ workId: 1, watchDelaySecFromPublish: 86400 }];
    expect(computeTickets(now, subscribedWorks, episodes)).toStrictEqual([]);
  });

  it("購読情報に一致しないworkIdは遅延0として扱う", () => {
    const episodes = [
      {
        workId: 2,
        count: 1,
        publishedAt: d("2024-01-10T04:00:00+09:00"),
        work: {
          title: "B",
          durationMin: 24,
          hashtag: null,
          officialSiteUrl: null,
        },
      },
    ];
    const subscribedWorks = [{ workId: 1, watchDelaySecFromPublish: 999999 }];
    expect(computeTickets(now, subscribedWorks, episodes)).toStrictEqual(
      episodes,
    );
  });

  it("空のエピソード配列では空配列を返す", () => {
    expect(computeTickets(now, [], [])).toStrictEqual([]);
  });

  it("全てのエピソードが未来の場合は空配列を返す", () => {
    const episodes = [
      {
        workId: 1,
        count: 1,
        publishedAt: d("2024-01-20T04:00:00+09:00"),
        work: {
          title: "A",
          durationMin: 24,
          hashtag: null,
          officialSiteUrl: null,
        },
      },
      {
        workId: 1,
        count: 2,
        publishedAt: d("2024-01-25T04:00:00+09:00"),
        work: {
          title: "A",
          durationMin: 24,
          hashtag: null,
          officialSiteUrl: null,
        },
      },
    ];
    expect(
      computeTickets(
        now,
        [{ workId: 1, watchDelaySecFromPublish: 0 }],
        episodes,
      ),
    ).toStrictEqual([]);
  });

  it("異なるworkIdごとに異なる遅延設定が適用される", () => {
    const episodes = [
      {
        workId: 1,
        count: 1,
        publishedAt: d("2024-01-14T12:00:00+09:00"),
        work: {
          title: "A",
          durationMin: 24,
          hashtag: null,
          officialSiteUrl: null,
        },
      },
      {
        workId: 2,
        count: 1,
        publishedAt: d("2024-01-14T12:00:00+09:00"),
        work: {
          title: "B",
          durationMin: 24,
          hashtag: null,
          officialSiteUrl: null,
        },
      },
    ];
    const subscribedWorks = [
      { workId: 1, watchDelaySecFromPublish: 86400 },
      { workId: 2, watchDelaySecFromPublish: 0 },
    ];
    const result = computeTickets(now, subscribedWorks, episodes);
    expect(result).toStrictEqual([episodes[1]]);
  });
});
