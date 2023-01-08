import { describe, expect, it } from "vitest";
import { eachCourOfInterval, date2cour, next } from "../util";

describe("date2cour", () => {
  it("翌日4時までは当クール", () => {
    expect(date2cour(new Date("2022-12-31T23:59:59+0900"))).toBe("2022autumn");
    expect(date2cour(new Date("2023-01-01T00:00:00+0900"))).toBe("2022autumn");
    expect(date2cour(new Date("2023-01-01T03:59:59+0900"))).toBe("2022autumn");
  });
  it("4時から次クール", () => {
    expect(date2cour(new Date("2023-01-01T04:00:00+0900"))).toBe("2023winter");
  });
});

describe("next", () => {
  it("年をまたがない", () => {
    expect(next("2022summer")).toBe("2022autumn");
  });
  it("年をまたぐ", () => {
    expect(next("2022autumn")).toBe("2023winter");
  });
});

describe("eachCourOfInterval", () => {
  it("同じ", () => {
    expect(eachCourOfInterval("2023winter", "2023winter")).toStrictEqual([
      "2023winter",
    ]);
  });
  it("年だけ同じ", () => {
    expect(eachCourOfInterval("2023winter", "2023summer")).toStrictEqual([
      "2023winter",
      "2023spring",
      "2023summer",
    ]);
  });
  it("1年またぐ", () => {
    expect(eachCourOfInterval("2022autumn", "2023summer")).toStrictEqual([
      "2022autumn",
      "2023winter",
      "2023spring",
      "2023summer",
    ]);
  });
  it("複数年またぐ", () => {
    expect(eachCourOfInterval("2022autumn", "2024summer")).toStrictEqual([
      "2022autumn",
      "2023winter",
      "2023spring",
      "2023summer",
      "2023autumn",
      "2024winter",
      "2024spring",
      "2024summer",
    ]);
  });
});
