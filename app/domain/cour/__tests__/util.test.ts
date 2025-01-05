import { describe, expect, it } from "vitest";

import { eachCourOfInterval, date2cour, next, symbol2cour } from "../util";

describe("date2cour", () => {
  it("翌日4時までは当クール", () => {
    expect(date2cour(new Date("2022-12-31T23:59:59+0900"))).toStrictEqual({
      year: 2022,
      season: "autumn",
    });
    expect(date2cour(new Date("2023-01-01T00:00:00+0900"))).toStrictEqual({
      year: 2022,
      season: "autumn",
    });
    expect(date2cour(new Date("2023-01-01T03:59:59+0900"))).toStrictEqual({
      year: 2022,
      season: "autumn",
    });
  });
  it("4時から次クール", () => {
    expect(date2cour(new Date("2023-01-01T04:00:00+0900"))).toStrictEqual({
      year: 2023,
      season: "winter",
    });
  });
});

describe("symbol2cour", () => {
  it("パースできる", () => {
    expect(symbol2cour("2023spring")).toStrictEqual({
      year: 2023,
      season: "spring",
    });
  });
  it("パースできないときundefinedを返す", () => {
    expect(symbol2cour("202spring")).toBeUndefined();
    expect(symbol2cour("20233spring")).toBeUndefined();
  });
});

describe("next", () => {
  it("年をまたがない", () => {
    expect(next({ year: 2022, season: "summer" })).toStrictEqual({
      year: 2022,
      season: "autumn",
    });
  });
  it("年をまたぐ", () => {
    expect(
      next({
        year: 2022,
        season: "autumn",
      }),
    ).toStrictEqual({
      year: 2023,
      season: "winter",
    });
  });
});

describe("eachCourOfInterval", () => {
  it("同じ", () => {
    expect(
      eachCourOfInterval(
        { year: 2023, season: "winter" },
        { year: 2023, season: "winter" },
      ),
    ).toStrictEqual([{ year: 2023, season: "winter" }]);
  });
  it("年だけ同じ", () => {
    expect(
      eachCourOfInterval(
        { year: 2023, season: "winter" },
        { year: 2023, season: "summer" },
      ),
    ).toStrictEqual([
      { year: 2023, season: "winter" },
      { year: 2023, season: "spring" },
      { year: 2023, season: "summer" },
    ]);
  });
  it("1年またぐ", () => {
    expect(
      eachCourOfInterval(
        { year: 2022, season: "autumn" },
        { year: 2023, season: "summer" },
      ),
    ).toStrictEqual([
      { year: 2022, season: "autumn" },
      { year: 2023, season: "winter" },
      { year: 2023, season: "spring" },
      { year: 2023, season: "summer" },
    ]);
  });
  it("複数年またぐ", () => {
    expect(
      eachCourOfInterval(
        { year: 2022, season: "autumn" },
        { year: 2024, season: "summer" },
      ),
    ).toStrictEqual([
      { year: 2022, season: "autumn" },
      { year: 2023, season: "winter" },
      { year: 2023, season: "spring" },
      { year: 2023, season: "summer" },
      { year: 2023, season: "autumn" },
      { year: 2024, season: "winter" },
      { year: 2024, season: "spring" },
      { year: 2024, season: "summer" },
    ]);
  });
});
