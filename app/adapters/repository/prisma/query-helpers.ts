import type { Prisma } from "@prisma/client";
import { Temporal } from "temporal-polyfill";

import type { Cour } from "~/domain/cour/consts";
import { cour2startDate, next } from "~/domain/cour/util";
import { zdt2Date } from "~/utils/date";

export function generateEpisodeDateQuery(
  cour: Cour | null,
): Prisma.EpisodeWhereInput {
  if (cour === null) {
    return {};
  }
  const searchDate = cour2startDate(cour);
  const endDate = cour2startDate(next(cour));
  return {
    publishedAt: {
      gte: searchDate,
      lte: endDate,
    },
  };
}

export function generateWorkDateQuery(
  cour: Cour | null,
): Prisma.WorkWhereInput {
  if (cour === null) {
    return {};
  }
  const searchDate = cour2startDate(cour);
  const endDate = zdt2Date(
    Temporal.Instant.fromEpochMilliseconds(searchDate.getTime())
      .toZonedDateTimeISO("Asia/Tokyo")
      .add({ months: 3 }),
  );
  return {
    episodes: {
      some: {
        publishedAt: {
          gte: searchDate,
          lte: endDate,
        },
      },
    },
  };
}
