import { describe, expect, it, test } from "vitest";

import {
  date2ZonedDateTime,
  get4OriginDate,
  get4OriginDateFromTemporal,
  getCourExpression,
  getCourExpressionFromTemporal,
  getPast7DaysLocaleDateString,
  getQuarterEachLocaleDateString,
  interval2CourList,
  startOf4OriginDay,
  startOf4OriginDayFromTemporal,
  getPast7DaysLocaleDateStringFromTemporal,
  getQuarterEachLocaleDateStringFromTemporal,
} from "../date";

test("get4OriginDate with Date", () => {
  expect(get4OriginDate(new Date("2022-06-09T22:00:00+0900"))).toBe(9);
  expect(get4OriginDate(new Date("2022-06-10T00:00:00+0900"))).toBe(9);
  expect(get4OriginDate(new Date("2022-06-10T03:59:00+0900"))).toBe(9);
  expect(get4OriginDate(new Date("2022-06-10T04:00:00+0900"))).toBe(10);
  // 1日の場合は前月最終日に戻る
  expect(get4OriginDate(new Date("2022-06-01T03:59:00+0900"))).toBe(31);
});

test("get4OriginDateFromTemporal", () => {
  expect(
    get4OriginDateFromTemporal(
      date2ZonedDateTime(new Date("2022-06-09T22:00:00+0900")),
    ),
  ).toBe(9);
  expect(
    get4OriginDateFromTemporal(
      date2ZonedDateTime(new Date("2022-06-10T00:00:00+0900")),
    ),
  ).toBe(9);
  expect(
    get4OriginDateFromTemporal(
      date2ZonedDateTime(new Date("2022-06-10T03:59:00+0900")),
    ),
  ).toBe(9);
  expect(
    get4OriginDateFromTemporal(
      date2ZonedDateTime(new Date("2022-06-10T04:00:00+0900")),
    ),
  ).toBe(10);
  expect(
    get4OriginDateFromTemporal(
      date2ZonedDateTime(new Date("2022-06-01T03:59:00+0900")),
    ),
  ).toBe(31);
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

test("startOf4OriginDayFromTemporal", () => {
  expect(
    startOf4OriginDayFromTemporal(
      date2ZonedDateTime(new Date("2022-06-09T22:00:00+0900")),
    ).toString(),
  ).toBe("2022-06-09T04:00:00+09:00[Asia/Tokyo]");
  expect(
    startOf4OriginDayFromTemporal(
      date2ZonedDateTime(new Date("2022-06-09T22:00:01+0900")),
    ).toString(),
  ).toBe("2022-06-09T04:00:00+09:00[Asia/Tokyo]");
  expect(
    startOf4OriginDayFromTemporal(
      date2ZonedDateTime(new Date("2022-06-10T00:00:00+0900")),
    ).toString(),
  ).toBe("2022-06-09T04:00:00+09:00[Asia/Tokyo]");
  expect(
    startOf4OriginDayFromTemporal(
      date2ZonedDateTime(new Date("2022-06-10T03:59:00+0900")),
    ).toString(),
  ).toBe("2022-06-09T04:00:00+09:00[Asia/Tokyo]");
  expect(
    startOf4OriginDayFromTemporal(
      date2ZonedDateTime(new Date("2022-06-10T04:00:00+0900")),
    ).toString(),
  ).toBe("2022-06-10T04:00:00+09:00[Asia/Tokyo]");
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

describe("getPast7DaysLocaleDateStringFromTemporal", () => {
  it("", () => {
    expect(
      getPast7DaysLocaleDateStringFromTemporal(
        date2ZonedDateTime(new Date("2022-08-20T04:00:00+0900")),
      ),
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
      getPast7DaysLocaleDateStringFromTemporal(
        date2ZonedDateTime(new Date("2022-08-20T03:59:00+0900")),
      ),
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

describe("getQuarterEachLocaleDateStringFromTemporal", () => {
  it("", () => {
    const spring = getQuarterEachLocaleDateStringFromTemporal(
      date2ZonedDateTime(new Date("2022-07-01T00:00:00")),
    );
    expect(spring[0]).toBe("2022/4/1");
    expect(spring[spring.length - 1]).toBe("2022/6/30");
    expect(
      getQuarterEachLocaleDateStringFromTemporal(
        date2ZonedDateTime(new Date("2022-07-01T04:00:00")),
      ),
    ).toStrictEqual(["2022/7/1"]);
    expect(
      getQuarterEachLocaleDateStringFromTemporal(
        date2ZonedDateTime(new Date("2022-07-02T03:59:00")),
      ),
    ).toStrictEqual(["2022/7/1"]);
    expect(
      getQuarterEachLocaleDateStringFromTemporal(
        date2ZonedDateTime(new Date("2022-07-02T04:00:00")),
      ),
    ).toStrictEqual(["2022/7/1", "2022/7/2"]);
  });
});

describe("getCourExpression", () => {
  it("should return the correct year and season for winter months (1-3)", () => {
    expect(getCourExpression(new Date("2022-01-01T00:00:00+0900"))).toBe(
      "2022冬",
    );
    expect(getCourExpression(new Date("2022-02-15T12:30:00+0900"))).toBe(
      "2022冬",
    );
    expect(getCourExpression(new Date("2022-03-31T23:59:59+0900"))).toBe(
      "2022冬",
    );
  });

  it("should return the correct year and season for spring months (4-6)", () => {
    expect(getCourExpression(new Date("2022-04-01T00:00:00+0900"))).toBe(
      "2022春",
    );
    expect(getCourExpression(new Date("2022-05-15T12:30:00+0900"))).toBe(
      "2022春",
    );
    expect(getCourExpression(new Date("2022-06-30T23:59:59+0900"))).toBe(
      "2022春",
    );
  });

  it("should return the correct year and season for summer months (7-9)", () => {
    expect(getCourExpression(new Date("2022-07-01T00:00:00+0900"))).toBe(
      "2022夏",
    );
    expect(getCourExpression(new Date("2022-08-15T12:30:00+0900"))).toBe(
      "2022夏",
    );
    expect(getCourExpression(new Date("2022-09-30T23:59:59+0900"))).toBe(
      "2022夏",
    );
  });

  it("should return the correct year and season for autumn months (10-12)", () => {
    expect(getCourExpression(new Date("2022-10-01T00:00:00+0900"))).toBe(
      "2022秋",
    );
    expect(getCourExpression(new Date("2022-11-15T12:30:00+0900"))).toBe(
      "2022秋",
    );
    expect(getCourExpression(new Date("2022-12-31T23:59:59+0900"))).toBe(
      "2022秋",
    );
  });

  it("should handle different years correctly", () => {
    expect(getCourExpression(new Date("2021-01-01T00:00:00+0900"))).toBe(
      "2021冬",
    );
    expect(getCourExpression(new Date("2023-04-01T00:00:00+0900"))).toBe(
      "2023春",
    );
    expect(getCourExpression(new Date("2024-07-01T00:00:00+0900"))).toBe(
      "2024夏",
    );
    expect(getCourExpression(new Date("2025-10-01T00:00:00+0900"))).toBe(
      "2025秋",
    );
  });
});
describe("getCourExpressionFromTemporal", () => {
  it("should return the correct year and season for winter months (1-3)", () => {
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-01-01T00:00:00+0900")),
      ),
    ).toBe("2022冬");
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-02-15T12:30:00+0900")),
      ),
    ).toBe("2022冬");
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-03-31T23:59:59+0900")),
      ),
    ).toBe("2022冬");
  });

  it("should return the correct year and season for spring months (4-6)", () => {
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-04-01T00:00:00+0900")),
      ),
    ).toBe("2022春");
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-05-15T12:30:00+0900")),
      ),
    ).toBe("2022春");
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-06-30T23:59:59+0900")),
      ),
    ).toBe("2022春");
  });

  it("should return the correct year and season for summer months (7-9)", () => {
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-07-01T00:00:00+0900")),
      ),
    ).toBe("2022夏");
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-08-15T12:30:00+0900")),
      ),
    ).toBe("2022夏");
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-09-30T23:59:59+0900")),
      ),
    ).toBe("2022夏");
  });

  it("should return the correct year and season for autumn months (10-12)", () => {
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-10-01T00:00:00+0900")),
      ),
    ).toBe("2022秋");
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-11-15T12:30:00+0900")),
      ),
    ).toBe("2022秋");
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2022-12-31T23:59:59+0900")),
      ),
    ).toBe("2022秋");
  });

  it("should handle different years correctly", () => {
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2021-01-01T00:00:00+0900")),
      ),
    ).toBe("2021冬");
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2023-04-01T00:00:00+0900")),
      ),
    ).toBe("2023春");
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2024-07-01T00:00:00+0900")),
      ),
    ).toBe("2024夏");
    expect(
      getCourExpressionFromTemporal(
        date2ZonedDateTime(new Date("2025-10-01T00:00:00+0900")),
      ),
    ).toBe("2025秋");
  });
});

describe("date2ZonedDateTime", () => {
  it("should convert a Date object to a Temporal.ZonedDateTime in Asia/Tokyo timezone", () => {
    const date = new Date("2022-08-20T04:00:00+0900");
    const zonedDateTime = date2ZonedDateTime(date);

    expect(zonedDateTime.toString()).toBe(
      "2022-08-20T04:00:00+09:00[Asia/Tokyo]",
    );
    expect(zonedDateTime.timeZoneId).toBe("Asia/Tokyo");
    expect(zonedDateTime.year).toBe(2022);
    expect(zonedDateTime.month).toBe(8);
    expect(zonedDateTime.day).toBe(20);
    expect(zonedDateTime.hour).toBe(4);
    expect(zonedDateTime.minute).toBe(0);
    expect(zonedDateTime.second).toBe(0);
  });

  it("should handle dates before the Unix epoch", () => {
    const date = new Date("1969-12-31T23:59:59+0900");
    const zonedDateTime = date2ZonedDateTime(date);

    expect(zonedDateTime.toString()).toBe(
      "1969-12-31T23:59:59+09:00[Asia/Tokyo]",
    );
    expect(zonedDateTime.year).toBe(1969);
    expect(zonedDateTime.month).toBe(12);
    expect(zonedDateTime.day).toBe(31);
    expect(zonedDateTime.hour).toBe(23);
  });

  it("should handle leap years correctly", () => {
    const date = new Date("2020-02-29T12:00:00+0900");
    const zonedDateTime = date2ZonedDateTime(date);

    expect(zonedDateTime.toString()).toBe(
      "2020-02-29T12:00:00+09:00[Asia/Tokyo]",
    );
    expect(zonedDateTime.year).toBe(2020);
    expect(zonedDateTime.month).toBe(2);
    expect(zonedDateTime.day).toBe(29);
  });
});
