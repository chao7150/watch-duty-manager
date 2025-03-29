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
