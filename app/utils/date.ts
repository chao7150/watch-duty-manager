import {
  eachDayOfInterval,
  eachQuarterOfInterval,
  endOfYear,
  getHours,
  setHours,
  startOfHour,
  startOfQuarter,
  subDays,
  subHours,
} from "date-fns";
import { Temporal } from "temporal-polyfill";

interface TemporalInterval {
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
}

/**
 * 指定された時間間隔内の四半期の配列を返します。
 *
 * @param interval - 間隔
 * @returns 間隔の開始の四半期から間隔の終了の四半期までの四半期の開始日の配列
 *
 * @example
 * // 2014年2月6日から2014年8月10日までの間隔内の各四半期：
 * const result = eachQuarterOfIntervalFromTemporal({
 *   start: date2ZonedDateTime(new Date(2014, 1, 6)),
 *   end: date2ZonedDateTime(new Date(2014, 7, 10))
 * })
 * //=> [
 * //   2014-01-01T00:00:00+09:00[Asia/Tokyo],
 * //   2014-04-01T00:00:00+09:00[Asia/Tokyo],
 * //   2014-07-01T00:00:00+09:00[Asia/Tokyo]
 * // ]
 */
export const eachQuarterOfIntervalFromTemporal = (
  interval: TemporalInterval,
): Temporal.ZonedDateTime[] => {
  const { start, end } = interval;

  // 開始日が終了日より後の場合はエラーをスロー
  if (Temporal.ZonedDateTime.compare(start, end) > 0) {
    throw new Error("The start date must be before the end date");
  }

  // 開始日の四半期の開始日を取得
  const startDate = startOfQuarterTemporal(start);
  const endDate = startOfQuarterTemporal(end);

  // 結果の配列
  const dates: Temporal.ZonedDateTime[] = [];

  // 終了日以前の四半期をすべて追加
  for (
    let currentDate = startDate;
    Temporal.ZonedDateTime.compare(currentDate, endDate) <= 0;
    currentDate = addQuartersTemporal(currentDate, 1)
  ) {
    dates.push(currentDate);
  }

  return dates;
};

/**
 * 指定された日付の四半期の開始日を返します。
 */
const startOfQuarterTemporal = (
  date: Temporal.ZonedDateTime,
): Temporal.ZonedDateTime => {
  return Temporal.ZonedDateTime.from({
    year: date.year,
    month: Math.floor((date.month - 1) / 3) * 3 + 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
    timeZone: date.timeZoneId,
  });
};

/**
 * 指定された日付に指定された四半期数を加算します。
 */
const addQuartersTemporal = (
  date: Temporal.ZonedDateTime,
  amount: number,
): Temporal.ZonedDateTime => {
  return date.add({ months: amount * 3 });
};

/**
 * 指定された開始日から現在の年の終わりまでの各四半期の表現とその日付のペアの配列を返します。
 */
export const interval2CourListFromTemporal = (
  start: Temporal.ZonedDateTime,
  now: Temporal.ZonedDateTime,
): [string, Temporal.ZonedDateTime][] => {
  // 4時間前の時間を計算
  const startMinus4Hours = start.subtract({ hours: 4 });
  const nowMinus4Hours = now.subtract({ hours: 4 });

  // 現在の年の終わりを計算
  const endOfYearDate = Temporal.ZonedDateTime.from({
    year: nowMinus4Hours.year,
    month: 12,
    day: 31,
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
    timeZone: nowMinus4Hours.timeZoneId,
  });

  // 四半期の開始日を取得
  return eachQuarterOfIntervalFromTemporal({
    start: startMinus4Hours,
    end: endOfYearDate,
  })
    .reverse()
    .map((q) => {
      return [getCourExpressionFromTemporal(q), q];
    });
};

export const get4OriginDate = (date: Date): number => {
  return new Date(date.getTime() - 1000 * 60 * 60 * 4).getDate();
};

export const get4OriginDateFromTemporal = (
  zonedDate: Temporal.ZonedDateTime,
): number => {
  return zonedDate.subtract({ hours: 4 }).day;
};

const monthSeasonNameMap: { [K: number]: string } = {
  1: "冬",
  2: "冬",
  3: "冬",
  4: "春",
  5: "春",
  6: "春",
  7: "夏",
  8: "夏",
  9: "夏",
  10: "秋",
  11: "秋",
  12: "秋",
};

export const getCourExpression = (date: Date): string => {
  return `${date.getFullYear()}${monthSeasonNameMap[date.getMonth() + 1]}`;
};

export const getCourExpressionFromTemporal = (
  zonedDate: Temporal.ZonedDateTime,
): string => {
  return `${zonedDate.year}${monthSeasonNameMap[zonedDate.month]}`;
};

export const interval2CourList = (start: Date, now: Date): [string, Date][] => {
  return eachQuarterOfInterval({
    start: subHours(start, 4),
    end: endOfYear(subHours(now, 4)),
  })
    .reverse()
    .map((q) => {
      return [getCourExpression(q), q];
    });
};

export const startOf4OriginDay = (date: Date): Date => {
  return getHours(date) < 4
    ? startOfHour(subDays(setHours(date, 4), 1))
    : startOfHour(setHours(date, 4));
};

export const getPast7DaysLocaleDateString = (now: Date): string[] => {
  return eachDayOfInterval({
    start: subDays(subHours(now, 4), 7),
    end: subHours(now, 4),
  }).map((d) => d.toLocaleDateString("ja"));
};

export const getQuarterEachLocaleDateString = (now: Date): string[] => {
  return eachDayOfInterval({
    start: startOfQuarter(subHours(now, 4)),
    end: subHours(now, 4),
  }).map((d) => d.toLocaleDateString("ja"));
};

export const date2ZonedDateTime = (date: Date): Temporal.ZonedDateTime => {
  return Temporal.Instant.fromEpochMilliseconds(
    date.getTime(),
  ).toZonedDateTimeISO("Asia/Tokyo");
};
