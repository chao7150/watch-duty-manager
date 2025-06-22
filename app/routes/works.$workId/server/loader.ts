import { LoaderFunctionArgs } from "@remix-run/node";

import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";
import { extractParams, isNumber } from "~/utils/type";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = (await getUserId(request)) ?? undefined;
  const { workId } = extractParams(params, ["workId"]);
  const workPromise = db.work.findUnique({
    where: { id: parseInt(workId, 10) },
    include: {
      users: {
        where: { userId },
      },
      episodes: {
        orderBy: { count: "asc" },
        ...(userId
          ? {
              include: {
                WatchedEpisodesOnUser: {
                  where: { userId },
                  select: { createdAt: true, rating: true },
                },
              },
            }
          : {}),
      },
    },
  });
  const subscriptionPromise =
    userId !== undefined
      ? db.subscribedWorksOnUser.findUnique({
          where: { userId_workId: { userId, workId: parseInt(workId, 10) } },
          select: { watchDelaySecFromPublish: true, watchUrl: true },
        })
      : Promise.resolve(undefined);
  const ratingsPromise =
    userId !== undefined
      ? db.watchedEpisodesOnUser.findMany({
          select: {
            episode: {
              select: {
                count: true,
              },
            },
            rating: true,
          },
          where: {
            workId: parseInt(workId, 10),
            userId,
          },
          orderBy: {
            episode: {
              count: "asc",
            },
          },
        })
      : Promise.resolve([]);
  const [work, subscription, ratings] = await Promise.all([
    workPromise,
    subscriptionPromise,
    ratingsPromise,
  ]);
  if (work === null) {
    throw Error("work not found");
  }
  if (userId === undefined) {
    return {
      work,
      rating: 0,
      ratings: [],
      subscribed: false,
      loggedIn: false,
      workTags: [],
      userTags: [],
    };
  }
  const map = new Map<number, number | null>();
  ratings.forEach((r) => {
    map.set(r.episode.count, r.rating);
  });
  const nonNullRatings = ratings.map((r) => r.rating).filter(isNumber);

  return {
    // usersを残すと誰が視聴しているかpublicに見えてしまうので消す
    work: { ...work, users: undefined },
    rating:
      nonNullRatings.length === 0
        ? 0
        : nonNullRatings.reduce((acc, val) => acc + val, 0) /
          nonNullRatings.length,
    ratings: Array.from({ length: work.episodes.length }).map((_, idx) => {
      return { count: idx + 1, rating: map.get(idx + 1) ?? null };
    }),
    subscribed: work?.users.length === 1,
    loggedIn: userId !== undefined,
    delay: subscription?.watchDelaySecFromPublish ?? undefined,
    url: subscription?.watchUrl ?? undefined,
  };
};

export type LoaderData = Awaited<ReturnType<typeof loader>>;
