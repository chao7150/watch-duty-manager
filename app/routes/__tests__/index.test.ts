import { describe, expect, it, test } from "vitest";

import { countOccurrence, getNormalizedDate, setOldestOfWork } from "../_index";

const possibleOldest = new Date("2022-06-01T22:00:00+0900"); // 入力の最小値
const yesterday4Am = new Date("2022-06-08T04:00:00+0900");
const today4Am = new Date("2022-06-09T04:00:00+0900");
const now = new Date("2022-06-09T22:00:00+0900");

test("", () => {
  expect(getNormalizedDate(now.getTime(), today4Am.getTime())).toBe(0);
  expect(getNormalizedDate(now.getTime(), today4Am.getTime() - 1)).toBe(-1);
  expect(getNormalizedDate(now.getTime(), yesterday4Am.getTime())).toBe(-1);
  expect(getNormalizedDate(now.getTime(), yesterday4Am.getTime() - 1)).toBe(-2);
  expect(getNormalizedDate(now.getTime(), possibleOldest.getTime())).toBe(-8);

  expect(getNormalizedDate(today4Am.getTime(), today4Am.getTime() - 1)).toBe(
    -1,
  );
  expect(getNormalizedDate(today4Am.getTime(), yesterday4Am.getTime())).toBe(
    -1,
  );

  expect(
    getNormalizedDate(today4Am.getTime() - 1, yesterday4Am.getTime()),
  ).toBe(0);
});

describe("setLatestOfWork", () => {
  it("ticketのうち同一のworkIdを持つものの中で一番若い話数ではない話数にはlatestOfWorkがtrue", () => {
    expect(
      setOldestOfWork([{ workId: 1 }, { workId: 2 }, { workId: 1 }]),
    ).toStrictEqual([
      { workId: 1, watchReady: false },
      { workId: 2, watchReady: true },
      { workId: 1, watchReady: true },
    ]);
  });
});

describe("countOccurrence", () => {
  it("各要素の出現回数をMapにして返す", () => {
    expect(countOccurrence(["a", "a", "b"])).toStrictEqual(
      new Map([
        ["a", 2],
        ["b", 1],
      ]),
    );
  });
});
