import { subHours } from "date-fns";
import { pipe } from "fp-ts/lib/function.js";

import type { Cour } from "./consts";
import { Season, SeasonExpression, SeasonStartMonth } from "./consts";

const isSeason = (s: unknown): s is Season => {
  /* eslint @typescript-eslint/no-explicit-any: "warn" */
  return typeof s === "string" && Season.includes(s as any);
};

export const isCour = (s: unknown): s is Cour => {
  return (
    typeof s === "object" &&
    s !== null &&
    "year" in s &&
    "season" in s &&
    typeof s.year === "number" &&
    isSeason(s.season)
  );
};

export const date2cour = (date: Date): Cour =>
  pipe(
    date,
    (date) => subHours(date, 4),
    (date) => {
      return {
        year: date.getFullYear(),
        season: Season[Math.floor(date.getMonth() / 3)],
      };
    },
  );

export const cour2startDate = (cour: Cour): Date => {
  return new Date(`${cour.year}-${SeasonStartMonth[cour.season]}`);
};

export const cour2symbol = (cour: Cour): string => {
  return `${cour.year}${cour.season}`;
};

// パースできないsymbolの場合undefinedを返す
export const symbol2cour = (symbol: string): Cour | undefined => {
  const yearString = symbol.substring(0, 4);
  const year = Number(yearString);
  if (Number.isNaN(year)) {
    return undefined;
  }
  const seasonString = symbol.substring(4);
  if (!isSeason(seasonString)) {
    return undefined;
  }
  return {
    year,
    season: seasonString,
  };
};

export const cour2expression = (cour: Cour): string => {
  return `${cour.year}${SeasonExpression[cour.season]}`;
};

export const next = (cour: Cour): Cour => {
  const year = cour.year;
  const season = cour.season;
  if (season === "autumn") {
    return {
      year: year + 1,
      season: "winter",
    };
  }
  return {
    year,
    season: Season[Season.indexOf(season) + 1],
  };
};

export const eachCourOfInterval = (first: Cour, last: Cour): Cour[] => {
  if (first === last) {
    return [first];
  }
  const { year: firstYear, season: firstSeason } = first;
  const { year: lastYear, season: lastSeason } = last;

  const firstSeasonIndex = Season.indexOf(firstSeason);
  const lastSeasonIndex = Season.indexOf(lastSeason);
  if (firstYear === lastYear) {
    const ret: Cour[] = [];
    for (let i = firstSeasonIndex; i <= lastSeasonIndex; i++) {
      ret.push({ year: firstYear, season: Season[i] });
    }
    return ret;
  }
  const ret: Cour[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    if (y === firstYear) {
      ret.push(
        ...Season.slice(firstSeasonIndex).map((season) => ({
          year: firstYear,
          season,
        })),
      );
    } else if (y === lastYear) {
      ret.push(
        ...Season.slice(0, lastSeasonIndex + 1).map((season) => ({
          year: lastYear,
          season,
        })),
      );
    } else {
      ret.push(...Season.map((season) => ({ year: y, season })));
    }
  }
  return ret;
};
