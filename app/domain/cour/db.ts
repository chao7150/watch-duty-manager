import type { PrismaClient } from "@prisma/client";

import type { Cour } from "./consts";
import { date2cour, eachCourOfInterval } from "./util";

export const getCourList = async (
  db: PrismaClient,
): Promise<ReadonlyArray<Cour>> => {
  const oldestEpisode = await db.episode.findFirstOrThrow({
    select: { publishedAt: true },
    orderBy: { publishedAt: "asc" },
    take: 1,
  });
  return eachCourOfInterval(
    date2cour(oldestEpisode.publishedAt),
    date2cour(new Date()),
  );
};
