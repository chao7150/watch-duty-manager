import { describe, expect, it } from "vitest";

import { setOldestOfWork } from "../compute";

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
