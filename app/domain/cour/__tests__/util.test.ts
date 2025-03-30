import { describe, expect, it } from "vitest";

import { date2ZonedDateTime } from "../../../utils/date";

import {
  eachCourOfInterval,
  date2cour,
  next,
  symbol2cour,
  cour2startDate,
  cour2symbol,
  cour2expression,
  zonedDateTime2cour,
  cour2startZonedDateTime,
} from "../util";

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

describe("zonedDateTime2cour", () => {
  it("翌日4時までは当クール", () => {
    expect(
      zonedDateTime2cour(
        date2ZonedDateTime(new Date("2022-12-31T23:59:59+0900")),
      ),
    ).toStrictEqual({
      year: 2022,
      season: "autumn",
    });
    expect(
      zonedDateTime2cour(
        date2ZonedDateTime(new Date("2023-01-01T00:00:00+0900")),
      ),
    ).toStrictEqual({
      year: 2022,
      season: "autumn",
    });
    expect(
      zonedDateTime2cour(
        date2ZonedDateTime(new Date("2023-01-01T03:59:59+0900")),
      ),
    ).toStrictEqual({
      year: 2022,
      season: "autumn",
    });
  });
  it("4時から次クール", () => {
    expect(
      zonedDateTime2cour(
        date2ZonedDateTime(new Date("2023-01-01T04:00:00+0900")),
      ),
    ).toStrictEqual({
      year: 2023,
      season: "winter",
    });
  });
});

describe("cour2startDate", () => {
  it("各クールの開始日時を返す", () => {
    expect(cour2startDate({ year: 2023, season: "winter" }).toISOString()).toBe(
      "2022-12-31T19:00:00.000Z",
    ); // 2023-01-01T04:00:00+09:00

    expect(cour2startDate({ year: 2023, season: "spring" }).toISOString()).toBe(
      "2023-03-31T19:00:00.000Z",
    ); // 2023-04-01T04:00:00+09:00

    expect(cour2startDate({ year: 2023, season: "summer" }).toISOString()).toBe(
      "2023-06-30T19:00:00.000Z",
    ); // 2023-07-01T04:00:00+09:00

    expect(cour2startDate({ year: 2023, season: "autumn" }).toISOString()).toBe(
      "2023-09-30T19:00:00.000Z",
    ); // 2023-10-01T04:00:00+09:00
  });
});

describe("cour2startZonedDateTime", () => {
  it("各クールの開始日時を返す", () => {
    expect(
      cour2startZonedDateTime({ year: 2023, season: "winter" }).toString(),
    ).toBe("2023-01-01T04:00:00+09:00[Asia/Tokyo]");

    expect(
      cour2startZonedDateTime({ year: 2023, season: "spring" }).toString(),
    ).toBe("2023-04-01T04:00:00+09:00[Asia/Tokyo]");

    expect(
      cour2startZonedDateTime({ year: 2023, season: "summer" }).toString(),
    ).toBe("2023-07-01T04:00:00+09:00[Asia/Tokyo]");

    expect(
      cour2startZonedDateTime({ year: 2023, season: "autumn" }).toString(),
    ).toBe("2023-10-01T04:00:00+09:00[Asia/Tokyo]");
  });
});

describe("cour2symbol", () => {
  it("クールをシンボル文字列に変換する", () => {
    expect(cour2symbol({ year: 2023, season: "winter" })).toBe("2023winter");
    expect(cour2symbol({ year: 2023, season: "spring" })).toBe("2023spring");
    expect(cour2symbol({ year: 2023, season: "summer" })).toBe("2023summer");
    expect(cour2symbol({ year: 2023, season: "autumn" })).toBe("2023autumn");
  });
});

describe("cour2expression", () => {
  it("クールを表示用文字列に変換する", () => {
    expect(cour2expression({ year: 2023, season: "winter" })).toBe("2023冬");
    expect(cour2expression({ year: 2023, season: "spring" })).toBe("2023春");
    expect(cour2expression({ year: 2023, season: "summer" })).toBe("2023夏");
    expect(cour2expression({ year: 2023, season: "autumn" })).toBe("2023秋");
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
