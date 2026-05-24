import { date2ZonedDateTime, formatZDT } from "~/utils/date";

/**
 * Date を日付キー (yyyy/M/d) に変換する。
 * 深夜アニメの性質を反映し、4時間前の日付で計算する（n日の28時まではn日として扱う）。
 */
export const getAnimeDate = (date: Date): string => {
  const shifted = date2ZonedDateTime(date).subtract({ hours: 4 });
  return formatZDT(shifted);
};
