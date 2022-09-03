import { WatchedEpisodesOnUser, Work } from "@prisma/client";
import { type DataFunctionArgs, json } from "@remix-run/server-runtime";
import * as F from "fp-ts/function";
import { Link, useLoaderData } from "remix";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/Task";
import * as A from "fp-ts/Apply";
import * as Episode from "../components/Episode/Episode";
import { db } from "~/utils/db.server";
import { requireUserIdTaskEither } from "~/utils/middlewares";
import { Serialized } from "~/utils/type";
import * as WorkUI from "~/components/Work/Work";
import { useMemo, useState } from "react";

type LoaderData = {
  subscribedWorks: (Work & { rating: number | undefined })[];
  recentWatchedEpisodes: (WatchedEpisodesOnUser & {
    episode: { work: { title: string } };
  })[];
  onairOnly: boolean;
};

const isNumber = (val: unknown): val is number => typeof val === "number";

export const loader = async (
  args: DataFunctionArgs
): Promise<LoaderData | Response> => {
  const url = new URL(args.request.url);
  const onairOnly = url.searchParams.get("onairOnly") !== "false";
  return await F.pipe(
    args,
    TE.of,
    requireUserIdTaskEither(undefined),
    TE.chain(({ userId }: { userId: string }) =>
      A.sequenceT(TE.ApplyPar)(
        TE.tryCatch(
          // subscribe中
          // かつ
          // 未放送のepisodeが1つ以上存在する作品
          async () =>
            (
              await db.work.findMany({
                where: {
                  users: { some: { userId } },
                  ...(onairOnly
                    ? {
                        episodes: {
                          some: { publishedAt: { gte: new Date() } },
                        },
                      }
                    : {}),
                },
                include: {
                  episodes: {
                    include: {
                      WatchedEpisodesOnUser: {
                        where: { userId },
                      },
                    },
                  },
                },
              })
            ).map((w) => {
              const ratings = w.episodes
                .map((e) => e.WatchedEpisodesOnUser[0]?.rating)
                .filter(isNumber);
              return {
                ...w,
                rating:
                  ratings.length === 0
                    ? undefined
                    : ratings.reduce((acc, val) => acc + val, 0) /
                      ratings.length,
              };
            }),
          (e) => {
            console.log(e);
            return json(
              { errorMessage: "subscribed works db error" },
              { status: 500 }
            );
          }
        ),
        TE.tryCatch(
          async () =>
            await db.watchedEpisodesOnUser.findMany({
              where: { userId },
              orderBy: { createdAt: "desc" },
              take: 10,
              include: {
                episode: { include: { work: { select: { title: true } } } },
              },
            }),
          () =>
            json(
              { errorMessage: "recently watched episodes db error" },
              { status: 500 }
            )
        )
      )
    ),
    TE.foldW(
      (e) => T.of(e),
      (v) =>
        T.of({ subscribedWorks: v[0], recentWatchedEpisodes: v[1], onairOnly })
    )
  )();
};

export const createQueries = ({
  onairOnly,
}: {
  onairOnly: boolean;
}): string => {
  const url = new URLSearchParams();
  !onairOnly && url.set("onairOnly", "false");
  return url.toString();
};

const FilterComponent = () => {
  return useMemo(() => {
    const [onairOnlyChecked, setOnairOnlyChecked] = useState(true);
    return (
      <details>
        <summary className="list-none cursor-pointer">
          <h3>絞り込み</h3>
        </summary>
        <div className="mt-2 w-64">
          <label>
            放送中
            <input
              className="ml-2"
              type="checkbox"
              checked={onairOnlyChecked}
              onChange={(e) => setOnairOnlyChecked(e.target.checked)}
            />
          </label>
          <div>
            <Link to={`/my?${createQueries({ onairOnly: onairOnlyChecked })}`}>
              適用する
            </Link>
          </div>
        </div>
      </details>
    );
  }, undefined);
};

export default function My() {
  const { subscribedWorks, recentWatchedEpisodes, onairOnly } =
    useLoaderData<Serialized<LoaderData>>();
  return (
    <div className="remix__page">
      <section>
        <h2>あなたの視聴作品リスト</h2>
        <section>
          <FilterComponent />
        </section>
        <section className="mt-4">
          <h3>
            <span>{onairOnly ? "放送中" : "全て"}</span>のアニメ(
            <span>{subscribedWorks.length}</span>)
          </h3>
          <ul className="mt-2">
            {subscribedWorks
              .sort((a, b) => {
                return (b.rating ?? 0) - (a.rating ?? 0);
              })
              .map((work) => (
                <li className="mt-1 flex items-center" key={work.id}>
                  <div className="w-4">
                    {work.rating !== undefined
                      ? work.rating.toFixed(1)
                      : undefined}
                  </div>
                  <div className="ml-4">
                    <WorkUI.Component
                      loggedIn={true}
                      id={work.id.toString()}
                      title={work.title}
                      subscribed={true}
                    />
                  </div>
                </li>
              ))}
          </ul>
        </section>
      </section>
      <section>
        <h2>最近見たエピソード</h2>
        <ul>
          {recentWatchedEpisodes.map((e) => (
            <li key={`${e.workId}-${e.count}`}>
              <Episode.Component.Watched
                workId={e.workId}
                title={e.episode.work.title}
                count={e.count}
                publishedAt={e.createdAt}
                comment={e.comment ?? undefined}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
