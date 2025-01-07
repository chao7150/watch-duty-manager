import { describe, expect, it, test } from "vitest";

import {
  get4OriginDate,
  getPast7DaysLocaleDateString,
  getQuarterEachLocaleDateString,
  interval2CourList,
  startOf4OriginDay,
} from "../date";

test("get4OriginDate", () => {
  expect(get4OriginDate(new Date("2022-06-09T22:00:00+0900"))).toBe(9);
  expect(get4OriginDate(new Date("2022-06-10T00:00:00+0900"))).toBe(9);
  expect(get4OriginDate(new Date("2022-06-10T03:59:00+0900"))).toBe(9);
  expect(get4OriginDate(new Date("2022-06-10T04:00:00+0900"))).toBe(10);
  // 1日の場合は前月最終日に戻る
  expect(get4OriginDate(new Date("2022-06-01T03:59:00+0900"))).toBe(31);
});

test("interval2CourList", () => {
  expect(
    interval2CourList(
      new Date("2022-01-01T00:00:00+0900"),
      new Date("2022-07-01T03:59:00+0900"),
    ).map(([label]) => label),
  ).toStrictEqual(["2022秋", "2022夏", "2022春", "2022冬", "2021秋"]);
  expect(
    interval2CourList(
      new Date("2022-01-01T04:00:00+0900"),
      new Date("2022-07-01T04:00:00+0900"),
    ).map(([label]) => label),
  ).toStrictEqual(["2022秋", "2022夏", "2022春", "2022冬"]);
});
test("startOf4OriginDay", () => {
  expect(startOf4OriginDay(new Date("2022-06-09T22:00:00+0900"))).toStrictEqual(
    new Date("2022-06-09T04:00:00+0900"),
  );
  expect(startOf4OriginDay(new Date("2022-06-09T22:00:01+0900"))).toStrictEqual(
    new Date("2022-06-09T04:00:00+0900"),
  );
  expect(startOf4OriginDay(new Date("2022-06-10T00:00:00+0900"))).toStrictEqual(
    new Date("2022-06-09T04:00:00+0900"),
  );
  expect(startOf4OriginDay(new Date("2022-06-10T03:59:00+0900"))).toStrictEqual(
    new Date("2022-06-09T04:00:00+0900"),
  );
  expect(startOf4OriginDay(new Date("2022-06-10T04:00:00+0900"))).toStrictEqual(
    new Date("2022-06-10T04:00:00+0900"),
  );
});

describe("getPast7DaysLocaleDateString", () => {
  it("", () => {
    expect(
      getPast7DaysLocaleDateString(new Date("2022-08-20T04:00:00+0900")),
    ).toStrictEqual([
      "2022/8/13",
      "2022/8/14",
      "2022/8/15",
      "2022/8/16",
      "2022/8/17",
      "2022/8/18",
      "2022/8/19",
      "2022/8/20",
    ]);
    expect(
      getPast7DaysLocaleDateString(new Date("2022-08-20T03:59:00+0900")),
    ).toStrictEqual([
      "2022/8/12",
      "2022/8/13",
      "2022/8/14",
      "2022/8/15",
      "2022/8/16",
      "2022/8/17",
      "2022/8/18",
      "2022/8/19",
    ]);
  });
});

describe("getQuarterEachLocaleDateString", () => {
  it("", () => {
    const spring = getQuarterEachLocaleDateString(
      new Date("2022-07-01T00:00:00"),
    );
    expect(spring[0]).toBe("2022/4/1");
    expect(spring[spring.length - 1]).toBe("2022/6/30");
    expect(
      getQuarterEachLocaleDateString(new Date("2022-07-01T04:00:00")),
    ).toStrictEqual(["2022/7/1"]);
    expect(
      getQuarterEachLocaleDateString(new Date("2022-07-02T03:59:00")),
    ).toStrictEqual(["2022/7/1"]);
    expect(
      getQuarterEachLocaleDateString(new Date("2022-07-02T04:00:00")),
    ).toStrictEqual(["2022/7/1", "2022/7/2"]);
  });
});
