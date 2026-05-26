import type { Prisma } from "@prisma/client";

import type { Cour } from "~/domain/cour/consts";
import { cour2startDate, next } from "~/domain/cour/util";
import type { EpisodeRepository } from "~/domain/episode/repository";
import { db } from "~/utils/db.server";
import { Err, Ok } from "~/utils/result";

export const episodeRepository: EpisodeRepository = {
  createMany: async (data) => {
    try {
      const result = await db.episode.createMany({ data });
      return Ok({ count: result.count });
    } catch (e) {
      return Err({
        type: "db" as const,
        message: "episode createMany failed",
        cause: e,
      });
    }
  },

  deleteAndReorder: async (workId, count) => {
    try {
      await db.$transaction([
        db.episode.delete({ where: { workId_count: { workId, count } } }),
        db.episode.updateMany({
          where: { workId, count: { gt: count } },
          data: { count: { decrement: 1 } },
        }),
      ]);
      return Ok(undefined);
    } catch (e) {
      return Err({
        type: "db" as const,
        message: "episode deleteAndReorder failed",
        cause: e,
      });
    }
  },

  findOldestPublishedAt: () =>
    db.episode
      .findFirstOrThrow({
        select: { publishedAt: true },
        orderBy: { publishedAt: "asc" },
        take: 1,
      })
      .then((e) => e.publishedAt),

  groupByWorkIdWithCount: (where, havingCount) =>
    db.episode
      .groupBy({
        by: ["workId"],
        where,
        _count: { workId: true },
        having: { workId: { _count: { gte: havingCount } } },
      })
      .then((rows) => rows.map((r) => r.workId)),

  findWorkIdsWithMinEpisodes: (cour, minEpisodes, additionalWhere = {}) => {
    const where: Prisma.EpisodeWhereInput = {
      ...generateEpisodeDateQuery(cour),
      ...additionalWhere,
    };
    return db.episode
      .groupBy({
        by: ["workId"],
        where,
        _count: { workId: true },
        having: { workId: { _count: { gte: minEpisodes } } },
      })
      .then((rows) => rows.map((r) => r.workId));
  },
};

function generateEpisodeDateQuery(cour: Cour | null): Prisma.EpisodeWhereInput {
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
