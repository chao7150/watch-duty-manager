import { expect, test } from "vitest";
import { getNormalizedDate } from "..";

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
    -1
  );
  expect(getNormalizedDate(today4Am.getTime(), yesterday4Am.getTime())).toBe(
    -1
  );

  expect(
    getNormalizedDate(today4Am.getTime() - 1, yesterday4Am.getTime())
  ).toBe(0);
});
