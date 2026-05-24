import type { PrismaClient } from "@prisma/client";
import type { EpisodeRepository } from "~/domain/episode/repository";
import { Err, Ok } from "~/utils/result";

export const createEpisodeRepository = (
  db: PrismaClient,
): EpisodeRepository => ({
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
});
