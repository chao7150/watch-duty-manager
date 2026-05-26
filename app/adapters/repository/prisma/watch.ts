import type { WatchRepository } from "~/domain/watch/repository";
import { db } from "~/utils/db.server";
import { Err, Ok } from "~/utils/result";

export const watchRepository: WatchRepository = {
  findSubscribedWorks: (userId) =>
    db.subscribedWorksOnUser.findMany({
      where: { userId },
      select: { watchDelaySecFromPublish: true, workId: true, watchUrl: true },
    }),

  findSubscribedWorksWithEpisodeStatus: (userId, workIds) =>
    db.work
      .findMany({
        where: { id: { in: workIds } },
        select: {
          id: true,
          title: true,
          episodes: {
            select: {
              count: true,
              publishedAt: true,
              EpisodeStatusOnUser: {
                where: { userId },
                select: { rating: true, createdAt: true },
              },
            },
          },
        },
      })
      .then((works) =>
        works.map((work) => ({
          id: work.id,
          title: work.title,
          episodes: work.episodes.map((ep) => ({
            count: ep.count,
            publishedAt: ep.publishedAt,
            status: ep.EpisodeStatusOnUser[0] ?? null,
          })),
        })),
      ),

  findUnwatchedEpisodes: (userId, workIds, publishedUntil) =>
    db.episode.findMany({
      where: {
        AND: [
          { work: { id: { in: workIds } } },
          { work: { users: { some: { userId } } } },
          {
            EpisodeStatusOnUser: {
              none: { userId, status: { in: ["watched", "skipped"] } },
            },
          },
          { publishedAt: { lte: publishedUntil } },
        ],
      },
      include: { work: true },
      orderBy: { publishedAt: "desc" },
    }),

  findWatchAchievementDates: (userId, since) =>
    db.episodeStatusOnUser.findMany({
      select: { createdAt: true },
      where: {
        userId,
        status: "watched",
        createdAt: { gte: since },
      },
    }),

  findRecentWatchAchievements: (userId, take) =>
    db.episodeStatusOnUser.findMany({
      where: { userId, status: "watched" },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        episode: {
          include: { work: true },
        },
      },
    }),

  subscribe: async (userId, workId) => {
    try {
      await db.subscribedWorksOnUser.create({ data: { userId, workId } });
      return Ok(undefined);
    } catch (e) {
      return Err({
        type: "db" as const,
        message: "subscribe failed",
        cause: e,
      });
    }
  },

  unsubscribe: async (userId, workId) => {
    try {
      await db.subscribedWorksOnUser.delete({
        where: { userId_workId: { userId, workId } },
      });
      return Ok(undefined);
    } catch (e) {
      return Err({
        type: "db" as const,
        message: "unsubscribe failed",
        cause: e,
      });
    }
  },

  updateWatchSettings: async (userId, workId, data) => {
    try {
      await db.subscribedWorksOnUser.update({
        where: { userId_workId: { userId, workId } },
        data,
      });
      return Ok(undefined);
    } catch (e) {
      return Err({
        type: "db" as const,
        message: "updateWatchSettings failed",
        cause: e,
      });
    }
  },

  findSubscription: (userId, workId) =>
    db.subscribedWorksOnUser.findUnique({
      where: { userId_workId: { userId, workId } },
      select: { workId: true, watchDelaySecFromPublish: true, watchUrl: true },
    }),
};
