import type { WorkRepository } from "~/domain/work/repository";
import type { WorkDetail, WorkListItem } from "~/domain/work/types";
import { db } from "~/utils/db.server";
import { Err, Ok } from "~/utils/result";

const isUniqueConstraintError = (e: unknown): boolean =>
  e != null &&
  typeof e === "object" &&
  "code" in e &&
  (e as { code: unknown }).code === "P2002";

// biome-ignore lint/suspicious/noExplicitAny: prisma dynamic include
const mapToWorkDetail = (work: any): WorkDetail => {
  return {
    id: work.id,
    title: work.title,
    publishedAt: work.publishedAt,
    durationMin: work.durationMin,
    officialSiteUrl: work.officialSiteUrl,
    twitterId: work.twitterId,
    hashtag: work.hashtag,
    episodes: work.episodes
      ? work.episodes.map(
          // biome-ignore lint/suspicious/noExplicitAny: prisma dynamic include
          (ep: any) => ({
            count: ep.count,
            publishedAt: ep.publishedAt,
            title: ep.title,
            description: ep.description,
            EpisodeStatusOnUser: ep.EpisodeStatusOnUser
              ? ep.EpisodeStatusOnUser.map(
                  // biome-ignore lint/suspicious/noExplicitAny: prisma dynamic include
                  (s: any) => ({
                    createdAt: s.createdAt,
                    rating: s.rating,
                    status: s.status,
                  }),
                )
              : undefined,
          }),
        )
      : undefined,
    users: work.users
      ? work.users.map(
          // biome-ignore lint/suspicious/noExplicitAny: prisma dynamic include
          (u: any) => ({
            userId: u.userId,
          }),
        )
      : undefined,
  };
};

// biome-ignore lint/suspicious/noExplicitAny: prisma dynamic include
const mapToWorkListItem = (work: any): WorkListItem => {
  return {
    id: work.id,
    title: work.title,
    publishedAt: work.publishedAt,
    durationMin: work.durationMin,
    officialSiteUrl: work.officialSiteUrl,
    twitterId: work.twitterId,
    hashtag: work.hashtag,
    episodes: work.episodes
      ? work.episodes.map(
          // biome-ignore lint/suspicious/noExplicitAny: prisma dynamic include
          (ep: any) => ({
            count: ep.count,
          }),
        )
      : undefined,
    users: work.users
      ? work.users.map(
          // biome-ignore lint/suspicious/noExplicitAny: prisma dynamic include
          (u: any) => ({
            userId: u.userId,
          }),
        )
      : undefined,
  };
};

export const workRepository: WorkRepository = {
  findById: async (id, options) => {
    const work = await db.work.findUnique({
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
    });
    return work ? mapToWorkDetail(work) : null;
  },

  findManyByIds: async (ids, options) => {
    const works = await db.work.findMany({
      where: { id: { in: ids } },
      include: {
        episodes: options.includeUsers ? { where: { count: 1 } } : false,
        users: options.includeUsers
          ? { where: { userId: options.includeUsers.userId } }
          : false,
      },
      orderBy: { id: "asc" },
    });
    return works.map(mapToWorkListItem);
  },

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
