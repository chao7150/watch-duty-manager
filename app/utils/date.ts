// date-fns は非推奨です。代わりに Temporal API を使用してください。
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
  const zdt = date2ZonedDateTime(date);
  return zdt.subtract({ hours: 4 }).day;
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
  const zdt = date2ZonedDateTime(date);
  return `${zdt.year}${monthSeasonNameMap[zdt.month]}`;
};

export const getCourExpressionFromTemporal = (
  zonedDate: Temporal.ZonedDateTime,
): string => {
  return `${zonedDate.year}${monthSeasonNameMap[zonedDate.month]}`;
};

/**
 * 指定された日付の「4時起点の日」の開始時刻をTemporal.ZonedDateTimeで返します。
 * 4時より前の場合は前日の4時、4時以降の場合は当日の4時を返します。
 *
 * @param zonedDate - Temporal.ZonedDateTime
 * @returns 4時起点の日の開始時刻
 */
export const startOf4OriginDayFromTemporal = (
  zonedDate: Temporal.ZonedDateTime,
): Temporal.ZonedDateTime => {
  // 4時より前の場合は前日の4時、4時以降の場合は当日の4時
  const baseDate =
    zonedDate.hour < 4 ? zonedDate.subtract({ days: 1 }) : zonedDate;

  // 指定された日の4時に設定
  return baseDate.startOfDay().with({ hour: 4 });
};

/**
 * 指定された日付から過去7日間の日付文字列の配列を返します。
 * 4時起点で計算します。
 *
 * @param now - Temporal.ZonedDateTime
 * @returns 過去7日間の日付文字列の配列
 */
export const getPast7DaysLocaleDateStringFromTemporal = (
  now: Temporal.ZonedDateTime,
): string[] => {
  // 4時間前の時間を計算
  const nowMinus4Hours = now.subtract({ hours: 4 });

  // 過去7日間の日付を生成（古い日付から新しい日付の順）
  const dates: Temporal.ZonedDateTime[] = [];
  for (let i = 7; i >= 0; i--) {
    dates.push(nowMinus4Hours.subtract({ days: i }));
  }

  // 日付文字列に変換
  return dates.map((d) => `${d.year}/${d.month}/${d.day}`);
};

/**
 * 指定された日付が属する四半期の各日の日付文字列の配列を返します。
 * 4時起点で計算します。
 *
 * @param now - Temporal.ZonedDateTime
 * @returns 四半期の各日の日付文字列の配列
 */
export const getQuarterEachLocaleDateStringFromTemporal = (
  now: Temporal.ZonedDateTime,
): string[] => {
  // 4時間前の時間を計算
  const nowMinus4Hours = now.subtract({ hours: 4 });

  // 四半期の開始日を計算
  const quarterStart = startOfQuarterTemporal(nowMinus4Hours);

  // 四半期の開始日から現在日までの日数を計算
  const daysDiff = nowMinus4Hours.since(quarterStart, {
    largestUnit: "days",
  }).days;

  // 四半期の各日を生成（forループを使用）
  const dates: Temporal.ZonedDateTime[] = [];
  for (let i = 0; i <= daysDiff; i++) {
    dates.push(quarterStart.add({ days: i }));
  }

  // 日付文字列に変換
  return dates.map((d) => `${d.year}/${d.month}/${d.day}`);
};

export const date2ZonedDateTime = (date: Date): Temporal.ZonedDateTime => {
  return Temporal.Instant.fromEpochMilliseconds(
    date.getTime(),
  ).toZonedDateTimeISO("Asia/Tokyo");
};

export const zdt2Date = (zdt: Temporal.ZonedDateTime): Date => {
  return new Date(zdt.epochMilliseconds);
};

/**
 * Date オブジェクトを Temporal.ZonedDateTime に変換し、指定した時間を引いた後、yyyy/MM/dd 形式の文字列に変換します。
 *
 * @param date - Date オブジェクト
 * @param hours - 引く時間（デフォルト: 4）
 * @returns yyyy/MM/dd 形式の文字列
 */
/**
 * Temporal.ZonedDateTime を yyyy/MM/dd 形式の文字列に変換します。
 *
 * @param zdt - Temporal.ZonedDateTime
 * @returns yyyy/MM/dd 形式の文字列
 */
export const formatZDT = (zdt: Temporal.ZonedDateTime): string => {
  return `${zdt.year}/${zdt.month}/${zdt.day}`;
};

/**
 * 秒数（負の数も含む）を日数と秒数のタプルに変換する
 * 秒数が負の場合日は負になり得るが秒数は常に正の値にする
 */
export const durationSec2DayAndSec = (seconds: number): [number, number] => {
  const days = Math.floor(seconds / 86400);
  return [days, seconds - days * 86400];
};
