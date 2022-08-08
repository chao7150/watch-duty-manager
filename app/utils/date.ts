import { getHours, setHours, startOfHour, subDays } from "date-fns";

export const get4OriginDate = (date: Date): number => {
  return new Date(date.getTime() - 1000 * 60 * 60 * 4).getDate();
};

export const startOf4OriginDay = (date: Date): Date => {
  return getHours(date) < 4
    ? startOfHour(subDays(setHours(date, 4), 1))
    : startOfHour(setHours(date, 4));
};
