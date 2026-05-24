import { describe, expect, it } from "vitest";

import {
  computeCumulativeMetrics,
  countOccurrence,
  mergeWeekMetrics,
} from "../compute";

describe("countOccurrence", () => {
  it("各要素の出現回数をMapにして返す", () => {
    expect(countOccurrence(["a", "a", "b"])).toStrictEqual(
      new Map([
        ["a", 2],
        ["b", 1],
      ]),
    );
  });

  it("空配列は空Mapを返す", () => {
    expect(countOccurrence([])).toStrictEqual(new Map());
  });

  it("重複がない場合は全て1", () => {
    expect(countOccurrence(["x", "y", "z"])).toStrictEqual(
      new Map([
        ["x", 1],
        ["y", 1],
        ["z", 1],
      ]),
    );
  });
});

describe("mergeWeekMetrics", () => {
  it("2つのMapをキーでマージする", () => {
    const keys = ["2022/6/7", "2022/6/8", "2022/6/9"];
    const watchAchievements = new Map([
      ["2022/6/8", 3],
      ["2022/6/9", 5],
    ]);
    const dutyAccumulation = new Map([["2022/6/7", 2]]);

    expect(
      mergeWeekMetrics(keys, watchAchievements, dutyAccumulation),
    ).toStrictEqual([
      { date: "2022/6/7", watchAchievements: 0, dutyAccumulation: 2 },
      { date: "2022/6/8", watchAchievements: 3, dutyAccumulation: 0 },
      { date: "2022/6/9", watchAchievements: 5, dutyAccumulation: 0 },
    ]);
  });

  it("空キー配列では空配列を返す", () => {
    expect(mergeWeekMetrics([], new Map(), new Map())).toStrictEqual([]);
  });
});

describe("computeCumulativeMetrics", () => {
  it("累積和を計算する", () => {
    const input = [
      { date: "a", watchAchievements: 1, dutyAccumulation: 2 },
      { date: "b", watchAchievements: 3, dutyAccumulation: 4 },
      { date: "c", watchAchievements: 5, dutyAccumulation: 6 },
    ];
    expect(computeCumulativeMetrics(input)).toStrictEqual([
      { date: "a", watchAchievements: 1, dutyAccumulation: 2 },
      { date: "b", watchAchievements: 4, dutyAccumulation: 6 },
      { date: "c", watchAchievements: 9, dutyAccumulation: 12 },
    ]);
  });

  it("単一要素はそのまま返す", () => {
    expect(
      computeCumulativeMetrics([
        { date: "x", watchAchievements: 10, dutyAccumulation: 20 },
      ]),
    ).toStrictEqual([
      { date: "x", watchAchievements: 10, dutyAccumulation: 20 },
    ]);
  });

  it("空配列は空配列を返す", () => {
    expect(computeCumulativeMetrics([])).toStrictEqual([]);
  });
});
