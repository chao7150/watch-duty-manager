import type { WatchRepository } from "~/domain/watch/repository";
import type { WorkRepository } from "~/domain/work/repository";
import { isNumber } from "~/utils/type";

export interface WorkDetailEpisode {
  workId: number;
  count: number;
  publishedAt: Date;
  title: string | null;
  description: string | null;
  EpisodeStatusOnUser?: {
    createdAt: Date;
    rating: number | null;
    status: "watched" | "skipped";
  }[];
}

export interface WorkDetailResult {
  work: {
    id: number;
    knowledgeNodeId: number;
    title: string;
    publishedAt: Date;
    durationMin: number;
    officialSiteUrl: string | null;
    twitterId: string | null;
    hashtag: string | null;
    episodes: WorkDetailEpisode[];
  };
  rating: number;
  ratings: { count: number; rating: number | null }[];
  subscribed: boolean;
  loggedIn: boolean;
  delay?: number;
  url?: string;
  workTags?: string[]; // 互換性維持
  userTags?: string[]; // 互換性維持
}

export const getWorkDetail =
  (deps: { workRepo: WorkRepository; watchRepo: WatchRepository }) =>
  async (params: {
    workId: number;
    userId: string | undefined;
  }): Promise<WorkDetailResult> => {
    const { workRepo, watchRepo } = deps;
    const { workId, userId } = params;

    const work = await workRepo.findById(workId, {
      includeEpisodes: true,
      includeEpisodeStatusOnUser: userId ? { userId } : undefined,
      includeUsers: userId ? { userId } : undefined,
    });

    if (work === null) {
      throw new Error("work not found");
    }

    const rawEpisodes = work.episodes ?? [];
    const episodes: WorkDetailEpisode[] = rawEpisodes.map((ep) => ({
      workId: work.id,
      count: ep.count,
      publishedAt: ep.publishedAt,
      title: ep.title,
      description: ep.description,
      EpisodeStatusOnUser: ep.EpisodeStatusOnUser?.map((s) => ({
        createdAt: s.createdAt,
        rating: s.rating,
        status: s.status as "watched" | "skipped",
      })),
    }));

    if (userId === undefined) {
      return {
        work: {
          ...work,
          episodes,
        },
        rating: 0,
        ratings: [],
        subscribed: false,
        loggedIn: false,
        workTags: [],
        userTags: [],
      };
    }

    // 購読情報の取得
    const subscription = await watchRepo.findSubscription(userId, workId);

    // 評価のマップ化と平均値の計算
    const ratingMap = new Map<number, number | null>();

    episodes.forEach((ep) => {
      const status = ep.EpisodeStatusOnUser?.[0];
      if (status && status.status === "watched") {
        ratingMap.set(ep.count, status.rating);
      }
    });

    const nonNullRatings = Array.from(ratingMap.values()).filter(isNumber);
    const avgRating =
      nonNullRatings.length === 0
        ? 0
        : nonNullRatings.reduce((acc, val) => acc + val, 0) /
          nonNullRatings.length;

    const ratingsList = Array.from({ length: episodes.length }).map(
      (_, idx) => {
        const count = idx + 1;
        return { count, rating: ratingMap.get(count) ?? null };
      },
    );

    return {
      work: {
        ...work,
        episodes,
      },
      rating: avgRating,
      ratings: ratingsList,
      subscribed: (work.users?.length ?? 0) === 1,
      loggedIn: true,
      delay: subscription?.watchDelaySecFromPublish ?? undefined,
      url: subscription?.watchUrl ?? undefined,
      workTags: [],
      userTags: [],
    };
  };
