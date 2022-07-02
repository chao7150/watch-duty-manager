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
          async () =>
            await db.work.findMany({
              where: { users: { some: { userId } } },
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
    <>
      <section>
        <h2>視聴中のアニメ</h2>
        <ul>
          {subscribedWorks.map((work) => (
            <li key={work.id}>{work.title}</li>
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
    </>
  );
}
