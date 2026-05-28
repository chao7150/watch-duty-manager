import type { Prisma } from "@prisma/client";

import type { Cour } from "~/domain/cour/consts";
import { cour2startDate, next } from "~/domain/cour/util";
import type { EpisodeRepository } from "~/domain/episode/repository";
import { db } from "~/utils/db.server";
import { Err, Ok } from "~/utils/result";

let cachedOldestPublishedAt: Date | null = null;
let cacheExpiredAt = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

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

  findOldestPublishedAt: async () => {
    const now = Date.now();
    if (cachedOldestPublishedAt !== null && now < cacheExpiredAt) {
      return cachedOldestPublishedAt;
    }

    const result = await db.episode.findFirstOrThrow({
      select: { publishedAt: true },
      orderBy: { publishedAt: "asc" },
      take: 1,
    });

    cachedOldestPublishedAt = result.publishedAt;
    cacheExpiredAt = now + CACHE_TTL_MS;
    return cachedOldestPublishedAt;
  },

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
