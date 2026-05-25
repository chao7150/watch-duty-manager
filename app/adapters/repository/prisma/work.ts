import type { WorkRepository } from "~/domain/work/repository";
import { db } from "~/utils/db.server";
import { Err, Ok } from "~/utils/result";

const isUniqueConstraintError = (e: unknown): boolean =>
  e != null &&
  typeof e === "object" &&
  "code" in e &&
  (e as { code: unknown }).code === "P2002";

export const workRepository: WorkRepository = {
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

  findManyByTitle: async (titles) => {
    try {
      const works = await db.work.findMany({
        where: { title: { in: titles } },
        select: { id: true, title: true },
      });
      return Ok(works);
    } catch (e) {
      return Err({
        type: "db" as const,
        message: "work findManyByTitle failed",
        cause: e,
      });
    }
  },

  create: async (data) => {
    try {
      const work = await db.work.create({ data });
      return Ok({ id: work.id });
    } catch (e) {
      if (isUniqueConstraintError(e)) {
        return Err({
          type: "unique_constraint" as const,
          duplicatedFields: ["title"],
        });
      }
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
      if (isUniqueConstraintError(e)) {
        return Err({
          type: "unique_constraint" as const,
          duplicatedFields: ["title"],
        });
      }
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
};
