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

export const get4OriginDate = (date: Date): number => {
  return new Date(date.getTime() - 1000 * 60 * 60 * 4).getDate();
};

const monthSeasonNameMap: { [K: number]: string } = {
  1: "冬",
  4: "春",
  7: "夏",
  10: "秋",
};

export const getCourExpression = (date: Date): string => {
  return `${date.getFullYear()}${monthSeasonNameMap[date.getMonth() + 1]}`;
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
  }).map((d) => d.toLocaleDateString());
};

export const getQuarterEachLocaleDateString = (now: Date): string[] => {
  return eachDayOfInterval({
    start: startOfQuarter(subHours(now, 4)),
    end: subHours(now, 4),
  }).map((d) => d.toLocaleDateString());
};
