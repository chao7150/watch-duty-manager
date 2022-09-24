import { WatchedEpisodesOnUser, Work } from "@prisma/client";
import { type DataFunctionArgs, json } from "@remix-run/server-runtime";
import * as F from "fp-ts/function";
import { Link, useLoaderData } from "@remix-run/react";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/Task";
import * as A from "fp-ts/Apply";
import * as Episode from "../components/Episode/Episode";
import { db } from "~/utils/db.server";
import { requireUserIdTaskEither } from "~/utils/middlewares";
import { Serialized } from "~/utils/type";
import * as WorkUI from "~/components/Work/Work";
import { useMemo, useState } from "react";
import { getCourName, interval2CourList } from "~/utils/date";
import { addQuarters } from "date-fns";

type LoaderData = {
  subscribedWorks: (Work & { rating: number | undefined })[];
  recentWatchedEpisodes: (WatchedEpisodesOnUser & {
    episode: { work: { title: string } };
  })[];
  onairOnly: boolean;
  startDate: string | null;
  oldestEpisodePublishedAt: string;
};

const isNumber = (val: unknown): val is number => typeof val === "number";

export const loader = async (
  args: DataFunctionArgs
): Promise<LoaderData | Response> => {
  const url = new URL(args.request.url);
  const onairOnly = url.searchParams.get("onairOnly") !== "false";
  const startDate = url.searchParams.get("startDate");
  const oldestEpisodePublishedAt =
    (
      await db.episode.findFirst({
        select: {
          publishedAt: true,
        },
        orderBy: {
          publishedAt: "asc",
        },
        take: 1,
      })
    )?.publishedAt.toISOString() ?? "";
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
                  AND: [
                    onairOnly
                      ? {
                          episodes: {
                            some: { WatchedEpisodesOnUser: { none: {} } },
                          },
                        }
                      : {},
                    startDate
                      ? {
                          episodes: {
                            some: {
                              publishedAt: {
                                // 4時始まりは未検討
                                gte: new Date(startDate),
                                lte: addQuarters(new Date(startDate), 1),
                              },
                            },
                          },
                        }
                      : {},
                  ],
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
        T.of({
          subscribedWorks: v[0],
          recentWatchedEpisodes: v[1],
          onairOnly,
          startDate,
          oldestEpisodePublishedAt,
        })
    )
  )();
};

export const createQueries = ({
  onairOnly,
  filterConditionStartDate,
}: {
  onairOnly: boolean;
  filterConditionStartDate: Date | undefined;
}): string => {
  const url = new URLSearchParams();
  !onairOnly && url.set("onairOnly", "false");
  filterConditionStartDate &&
    url.set("startDate", filterConditionStartDate.toISOString());
  return url.toString();
};

type FilterComponentProps = {
  onairOnly: boolean;
  initialStartDate: string | null;
  oldestEpisodePublishedAt: Date;
  now: Date;
};

const FilterComponent: React.FC<FilterComponentProps> = ({
  onairOnly,
  initialStartDate,
  oldestEpisodePublishedAt,
  now,
}) => {
  const [onairOnlyChecked, setOnairOnlyChecked] = useState(onairOnly);
  const [filterCondition, setFilterCondition] = useState<
    { label: string; start: Date } | undefined
  >(
    initialStartDate
      ? {
          label: getCourName(new Date(initialStartDate)),
          start: new Date(initialStartDate),
        }
      : undefined
  );
  const courList = interval2CourList(oldestEpisodePublishedAt, now);
  return useMemo(() => {
    return (
      <details>
        <summary className="list-none cursor-pointer">
          <h3>絞り込み</h3>
        </summary>
        <div className="mt-2 w-64">
          <label>
            未完走のみ
            <input
              className="ml-2"
              type="checkbox"
              checked={onairOnlyChecked}
              onChange={(e) => setOnairOnlyChecked(e.target.checked)}
            />
          </label>
          <div
            className={`${
              filterCondition === undefined
                ? "text-text-strong font-bold bg-accent-area"
                : ""
            }`}
          >
            <button onClick={() => setFilterCondition(undefined)}>
              全期間
            </button>
          </div>
          <ul className="works-filter-condition-list">
            {courList.map(([label, start]) => {
              const selected = label == filterCondition?.label;
              return (
                <li
                  className={`${
                    selected ? "text-text-strong font-bold bg-accent-area" : ""
                  }`}
                  key={label}
                >
                  <button onClick={() => setFilterCondition({ label, start })}>
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
          <div>
            <Link
              to={`/my?${createQueries({
                onairOnly: onairOnlyChecked,
                filterConditionStartDate: filterCondition?.start,
              })}`}
            >
              適用する
            </Link>
          </div>
        </div>
      </details>
    );
  }, [onairOnlyChecked, filterCondition]);
};

export default function My() {
  const {
    subscribedWorks,
    recentWatchedEpisodes,
    onairOnly,
    startDate,
    oldestEpisodePublishedAt,
  } = useLoaderData<Serialized<LoaderData>>();
  console.log(
    interval2CourList(new Date(oldestEpisodePublishedAt), new Date())
  );
  return (
    <div className="remix__page">
      <section>
        <h2>あなたの視聴作品リスト</h2>
        <section>
          <FilterComponent
            onairOnly={onairOnly}
            initialStartDate={startDate}
            oldestEpisodePublishedAt={new Date(oldestEpisodePublishedAt)}
            now={new Date()}
          />
        </section>
        <section className="mt-4">
          <h3>
            <span>
              {startDate ? `${getCourName(new Date(startDate))}の` : ""}
              {onairOnly ? "未完走" : "全て"}
            </span>
            のアニメ(
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
        <ul className="mt-4 flex flex-col gap-4">
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
