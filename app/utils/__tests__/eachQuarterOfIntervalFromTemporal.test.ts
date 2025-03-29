import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

import { date2ZonedDateTime } from "../date";
import { eachQuarterOfIntervalFromTemporal } from "../date";

describe("eachQuarterOfIntervalFromTemporal", () => {
  it("四半期の開始日から終了日までの四半期の開始日を配列で返す", () => {
    const result = eachQuarterOfIntervalFromTemporal({
      start: date2ZonedDateTime(new Date(2014, 2 /* Mar */, 6)),
      end: date2ZonedDateTime(new Date(2014, 7 /* Aug */, 12)),
    });
    expect(result.length).toBe(3);
    expect(result[0].toString()).toBe("2014-01-01T00:00:00+09:00[Asia/Tokyo]");
    expect(result[1].toString()).toBe("2014-04-01T00:00:00+09:00[Asia/Tokyo]");
    expect(result[2].toString()).toBe("2014-07-01T00:00:00+09:00[Asia/Tokyo]");
  });

  it("日付が日の開始でない場合も処理する", () => {
    const result = eachQuarterOfIntervalFromTemporal({
      start: date2ZonedDateTime(new Date(2014, 2 /* Mar */, 6, 6, 35)),
      end: date2ZonedDateTime(new Date(2014, 7 /* Aug */, 12, 22, 15)),
    });
    expect(result.length).toBe(3);
    expect(result[0].toString()).toBe("2014-01-01T00:00:00+09:00[Asia/Tokyo]");
    expect(result[1].toString()).toBe("2014-04-01T00:00:00+09:00[Asia/Tokyo]");
    expect(result[2].toString()).toBe("2014-07-01T00:00:00+09:00[Asia/Tokyo]");
  });

  it("両方の引数が同じ四半期にある場合は1つの四半期を返す", () => {
    const result = eachQuarterOfIntervalFromTemporal({
      start: date2ZonedDateTime(new Date(2014, 0 /* Jan */, 6, 14)),
      end: date2ZonedDateTime(new Date(2014, 2 /* Mar */, 9, 15)),
    });
    expect(result.length).toBe(1);
    expect(result[0].toString()).toBe("2014-01-01T00:00:00+09:00[Asia/Tokyo]");
  });

  it("両方の引数が同じ場合は1つの四半期を返す", () => {
    const result = eachQuarterOfIntervalFromTemporal({
      start: date2ZonedDateTime(new Date(2014, 9 /* Oct */, 6, 14)),
      end: date2ZonedDateTime(new Date(2014, 9 /* Oct */, 6, 14)),
    });
    expect(result.length).toBe(1);
    expect(result[0].toString()).toBe("2014-10-01T00:00:00+09:00[Asia/Tokyo]");
  });

  it("開始日が終了日より後の場合は例外をスローする", () => {
    expect(() => {
      eachQuarterOfIntervalFromTemporal({
        start: date2ZonedDateTime(new Date(2014, 7 /* Aug */, 12)),
        end: date2ZonedDateTime(new Date(2014, 2 /* Mar */, 6)),
      });
    }).toThrow();
  });

  it("開始日が無効な日付の場合は例外をスローする", () => {
    expect(() => {
      eachQuarterOfIntervalFromTemporal({
        start: Temporal.ZonedDateTime.from({
          year: NaN,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
          millisecond: 0,
          timeZone: "Asia/Tokyo",
        }),
        end: date2ZonedDateTime(new Date(2014, 9 /* Oct */, 6)),
      });
    }).toThrow();
  });

  it("終了日が無効な日付の場合は例外をスローする", () => {
    expect(() => {
      eachQuarterOfIntervalFromTemporal({
        start: date2ZonedDateTime(new Date(2014, 9 /* Oct */, 12)),
        end: Temporal.ZonedDateTime.from({
          year: NaN,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
          millisecond: 0,
          timeZone: "Asia/Tokyo",
        }),
      });
    }).toThrow();
  });

  it("両方のプロパティが無効な日付の場合は例外をスローする", () => {
    expect(() => {
      eachQuarterOfIntervalFromTemporal({
        start: Temporal.ZonedDateTime.from({
          year: NaN,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
          millisecond: 0,
          timeZone: "Asia/Tokyo",
        }),
        end: Temporal.ZonedDateTime.from({
          year: NaN,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
          millisecond: 0,
          timeZone: "Asia/Tokyo",
        }),
      });
    }).toThrow();
  });

  it("年をまたぐ間隔を処理する", () => {
    const result = eachQuarterOfIntervalFromTemporal({
      start: date2ZonedDateTime(new Date(2014, 9 /* Oct */, 6)),
      end: date2ZonedDateTime(new Date(2015, 2 /* Mar */, 6)),
    });

    expect(result.length).toBe(2);
    expect(result[0].toString()).toBe("2014-10-01T00:00:00+09:00[Asia/Tokyo]");
    expect(result[1].toString()).toBe("2015-01-01T00:00:00+09:00[Asia/Tokyo]");
  });
});
