import { expect, test } from "vitest";
import { getNormalizedDate } from "..";

const minus8days = new Date("2022-06-01T22:00:00+0900"); // 入力の最小値
const minus8daysNextMidnight = new Date("2022-06-02T00:00:00+0900");
const latestMidnight = new Date("2022-06-09T00:00:00+0900");
const now = new Date("2022-06-09T22:00:00+0900");

test("getNormalizedTest", () => {
  expect(getNormalizedDate(now.getTime(), minus8days.getTime())).toBe(-8);
  expect(
    getNormalizedDate(now.getTime(), minus8daysNextMidnight.getTime() - 1)
  ).toBe(-8);
  expect(
    getNormalizedDate(now.getTime(), minus8daysNextMidnight.getTime())
  ).toBe(-7);
  expect(getNormalizedDate(now.getTime(), latestMidnight.getTime() - 1)).toBe(
    -1
  );
  expect(getNormalizedDate(now.getTime(), latestMidnight.getTime())).toBe(0);
  expect(getNormalizedDate(now.getTime(), now.getTime())).toBe(0);
});
