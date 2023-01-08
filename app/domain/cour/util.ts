import { subHours } from "date-fns";
import { pipe } from "fp-ts/function";
import {
  Cour,
  Season,
  SeasonExpression,
  SeasonStartMonth,
  Year,
} from "./consts";

const isSeason = (s: string): s is Season => {
  return Season.includes(s as any);
};

const isYear = (s: string): s is Year => {
  return s.length === 4 && 2000 <= Number(s) && Number(s) < 3000;
};

export const isCour = (s: string): s is Cour => {
  return isYear(s.substring(0, 4)) && isSeason(s.substring(4));
};

const getCourYear = (c: Cour): Year => {
  const year = c.substring(0, 4);
  if (!isYear(year)) {
    throw new Error("cannot parse year from cour string");
  }
  return year;
};

const getCourSeason = (c: Cour): Season => {
  const season = c.substring(4);
  if (!isSeason(season)) {
    throw new Error("cannot parse season from cour string");
  }
  return season;
};

export const date2cour = (date: Date): Cour =>
  pipe(
    date,
    (date) => subHours(date, 4),
    (date) => {
      return `${String(date.getFullYear()) as Year}${
        Season[Math.floor(date.getMonth() / 3)]
      }` as Cour;
    }
  );

export const cour2startDate = (cour: Cour): Date => {
  return new Date(
    `${getCourYear(cour)}-${SeasonStartMonth[getCourSeason(cour)]}`
  );
};

export const cour2expression = (cour: Cour): string => {
  return `${getCourYear(cour)}${SeasonExpression[getCourSeason(cour)]}`;
};

export const eachCourOfInterval = (first: Cour, last: Cour): Cour[] => {
  if (first === last) {
    return [first];
  }
  const firstYear = first.substring(0, 4);
  const lastYear = last.substring(0, 4);
  if (!isYear(firstYear) || !isYear(lastYear)) {
    return [];
  }
  const firstSeason = first.substring(4);
  const lastSeason = last.substring(4);
  if (!isSeason(firstSeason) || !isSeason(lastSeason)) {
    return [];
  }
  const firstSeasonIndex = Season.indexOf(firstSeason);
  const lastSeasonIndex = Season.indexOf(lastSeason);
  if (firstYear === lastYear) {
    const ret: Cour[] = [];
    for (let i = firstSeasonIndex; i <= lastSeasonIndex; i++) {
      ret.push(`${firstYear}${Season[i]}`);
    }
    return ret;
  }
  const ret: Cour[] = [];
  for (let y = Number(firstYear); y <= Number(lastYear); y++) {
    if (y === Number(firstYear)) {
      ret.push(
        ...Season.slice(firstSeasonIndex).map(
          (season) => `${firstYear}${season}` as Cour
        )
      );
    } else if (y === Number(lastYear)) {
      ret.push(
        ...Season.slice(0, lastSeasonIndex + 1).map(
          (season) => `${lastYear}${season}` as Cour
        )
      );
    } else {
      ret.push(...Season.map((season) => `${y}${season}` as Cour));
    }
  }
  return ret;
};
