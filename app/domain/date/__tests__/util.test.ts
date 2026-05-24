import { describe, expect, it } from "vitest";

import { getAnimeDate } from "../util";

describe("getAnimeDate", () => {
  it("日本時間0時以降で4時より前は前日の日付キーを返す", () => {
    const date0000 = new Date("2022-06-09T00:00:00+09:00");
    expect(getAnimeDate(date0000)).toBe("2022/6/8");
    const date0359 = new Date("2022-06-09T03:59:59+09:00");
    expect(getAnimeDate(date0359)).toBe("2022/6/8");
  });

  it("日本時間4時以降で24時より前は当日の日付キーを返す", () => {
    const date0400 = new Date("2022-06-09T04:00:00+09:00");
    expect(getAnimeDate(date0400)).toBe("2022/6/9");
    const date2359 = new Date("2022-06-09T23:59:59+09:00");
    expect(getAnimeDate(date2359)).toBe("2022/6/9");
  });

  it("1桁の月日も正しくフォーマットされる", () => {
    const date = new Date("2022-01-05T10:00:00+09:00");
    expect(getAnimeDate(date)).toBe("2022/1/5");
  });
});
