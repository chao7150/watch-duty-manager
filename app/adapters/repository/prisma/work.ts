import type { PrismaClient } from "@prisma/client";
import type { WorkRepository } from "~/domain/work/repository";
import { Err, Ok } from "~/utils/result";

export const createWorkRepository = (db: PrismaClient): WorkRepository => ({
  findById: (id, options) =>
    db.work.findUnique({
      where: { id },
      include: {
        episodes: options.includeEpisodes
          ? {
              orderBy: { count: "asc" },
              ...(options.includeEpisodeStatusOnUser
                ? {
                    include: {
                      EpisodeStatusOnUser: {
                        where: {
                          userId: options.includeEpisodeStatusOnUser.userId,
                        },
                        select: { createdAt: true, rating: true, status: true },
                      },
                    },
                  }
                : {}),
            }
          : false,
        users: options.includeUsers
          ? { where: { userId: options.includeUsers.userId } }
          : false,
      },
    }) as ReturnType<WorkRepository["findById"]>,

  findManyByIds: (ids, options) =>
    db.work.findMany({
      where: { id: { in: ids } },
      include: {
        episodes: options.includeUsers ? { where: { count: 1 } } : false,
        users: options.includeUsers
          ? { where: { userId: options.includeUsers.userId } }
          : false,
      },
      orderBy: { id: "asc" },
    }) as ReturnType<WorkRepository["findManyByIds"]>,

  findManyByTitle: (titles) =>
    db.work.findMany({
      where: { title: { in: titles } },
      select: { id: true, title: true },
    }),

  create: async (data) => {
    try {
      const work = await db.work.create({ data });
      return Ok({ id: work.id });
    } catch (e) {
      return Err({
        type: "db" as const,
        message: "work create failed",
        cause: e,
      });
    }
  },

  createMany: async (data) => {
    try {
      await db.work.createMany({ data });
      return Ok(undefined);
    } catch (e) {
      return Err({
        type: "db" as const,
        message: "work createMany failed",
        cause: e,
      });
    }
  },

  update: async (id, data) => {
    try {
      const work = await db.work.update({ where: { id }, data });
      return Ok({ title: work.title });
    } catch (e) {
      return Err({
        type: "db" as const,
        message: "work update failed",
        cause: e,
      });
    }
  },

  count: () => db.work.count(),
});
