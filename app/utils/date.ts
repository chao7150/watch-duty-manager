import {
  eachQuarterOfInterval,
  endOfYear,
  getHours,
  setHours,
  startOfHour,
  subDays,
  subHours,
} from "date-fns";

export const get4OriginDate = (date: Date): number => {
  return new Date(date.getTime() - 1000 * 60 * 60 * 4).getDate();
};

const monthSeasonNameMap: { [K: number]: string } = {
  1: "冬",
  4: "春",
  7: "夏",
  10: "秋",
};

export const interval2CourList = (start: Date, now: Date): [string, Date][] => {
  return eachQuarterOfInterval({
    start: subHours(start, 4),
    end: endOfYear(subHours(now, 4)),
  })
    .reverse()
    .map((q) => {
      return [`${q.getFullYear()}${monthSeasonNameMap[q.getMonth() + 1]}`, q];
    });
};

export const startOf4OriginDay = (date: Date): Date => {
  return getHours(date) < 4
    ? startOfHour(subDays(setHours(date, 4), 1))
    : startOfHour(setHours(date, 4));
};
