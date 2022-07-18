import { WatchedEpisodesOnUser, Work } from "@prisma/client";
import { type DataFunctionArgs, json } from "@remix-run/server-runtime";
import { pipe } from "fp-ts/lib/function";
import { useLoaderData } from "remix";
import { db } from "~/utils/db.server";
import { requireUserIdTaskEither } from "~/utils/middlewares";
import { Serialized } from "~/utils/type";
import * as Episode from "../components/Episode/Episode";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/Task";
import { sequenceT } from "fp-ts/lib/Apply";
import * as WorkUI from "~/components/Work/Work";

type LoaderData = {
  subscribedWorks: Work[];
  recentWatchedEpisodes: (WatchedEpisodesOnUser & {
    episode: { work: { title: string } };
  })[];
};

export const loader = async (
  args: DataFunctionArgs
): Promise<LoaderData | Response> => {
  return await pipe(
    args,
    TE.of,
    requireUserIdTaskEither(undefined),
    TE.chain(({ userId }: { userId: string }) =>
      sequenceT(TE.ApplyPar)(
        TE.tryCatch(
          // subscribe中
          // かつ
          // 未放送のepisodeが1つ以上存在する作品
          async () =>
            await db.work.findMany({
              where: {
                users: { some: { userId } },
                episodes: { some: { publishedAt: { gte: new Date() } } },
              },
            }),
          () =>
            json({ errorMessage: "subscribed works db error" }, { status: 500 })
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
      (v) => T.of({ subscribedWorks: v[0], recentWatchedEpisodes: v[1] })
    )
  )();
};

export default function My() {
  const { subscribedWorks, recentWatchedEpisodes } =
    useLoaderData<Serialized<LoaderData>>();

  return (
    <div className="remix__page">
      <section>
        <h2>
          放送中で視聴中のアニメ<span>({subscribedWorks.length})</span>
        </h2>
        <ul>
          {subscribedWorks.map((work) => (
            <li key={work.id}>
              <WorkUI.Component
                loggedIn={true}
                id={work.id.toString()}
                title={work.title}
                subscribed={true}
              />
            </li>
          ))}
        </ul>
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
