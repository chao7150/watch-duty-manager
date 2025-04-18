import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { useState, useCallback } from "react";

import type { Prisma } from "@prisma/client";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  BarChart,
  Bar,
} from "recharts";
import { Temporal } from "temporal-polyfill";

import {
  cour2expression,
  cour2startDate,
  cour2startZonedDateTime,
  cour2symbol,
  next,
  symbol2cour,
} from "../domain/cour/util";
import type { Cour } from "~/domain/cour/consts";
import { getCourList } from "~/domain/cour/db";

import * as CourSelect from "~/components/CourSelect";
import * as FilterIcon from "~/components/Icons/Filter";

import { zdt2Date } from "~/utils/date";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { isNumber } from "~/utils/type";

import { getQuarterMetrics } from "./_index";
import { bindUrl as bindUrlForWorks$WorkId$Count } from "./works.$workId.$count";
import { bindUrl as bindUrlForWorks$WorkId } from "./works.$workId/route";

const generateStartDateQuery = (cour: Cour | null): Prisma.WorkWhereInput => {
  if (cour === null) {
    return {};
  }
  const searchDate = cour2startDate(cour);
  // Date を Temporal.ZonedDateTime に変換し、3ヶ月後の日付を計算
  const endDate = zdt2Date(
    Temporal.Instant.fromEpochMilliseconds(searchDate.getTime())
      .toZonedDateTimeISO("Asia/Tokyo")
      .add({ months: 3 }),
  );
  return {
    episodes: {
      some: {
        publishedAt: {
          // 4時始まりは未検討
          gte: searchDate,
          lte: endDate,
        },
      },
    },
  };
};

const _generateStartDateQuery = (
  cour: Cour | null,
): Prisma.EpisodeWhereInput => {
  if (cour === null) {
    return {};
  }
  const searchDate = cour2startDate(cour);
  // Date を Temporal.ZonedDateTime に変換し、3ヶ月後の日付を計算
  const endDate = zdt2Date(
    Temporal.Instant.fromEpochMilliseconds(searchDate.getTime())
      .toZonedDateTimeISO("Asia/Tokyo")
      .add({ months: 3 }),
  );
  return {
    publishedAt: {
      // 4時始まりは未検討
      gte: searchDate,
      lte: endDate,
    },
  };
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const courString = url.searchParams.get("cour");
  let cour: Cour | null;
  if (courString === null) {
    cour = null;
  } else {
    cour = symbol2cour(courString) ?? null;
    if (cour === null) {
      throw new Error("cour is invalid.");
    }
  }
  const minEpisodes = Number(url.searchParams.get("minEpisodes") ?? "3");
  const watchingWorkIds = (
    await db.episode.groupBy({
      by: ["workId"],
      where: {
        work: {
          users: { some: { userId } },
        },
        ..._generateStartDateQuery(cour),
      },
      _count: {
        workId: true,
      },
      having: {
        workId: {
          _count: {
            gte: minEpisodes,
          },
        },
      },
    })
  ).map((e) => e.workId);
  const watchingWorksPromise = db.work.findMany({
    where: {
      id: { in: watchingWorkIds },
    },
    include: {
      episodes: {
        include: {
          WatchedEpisodesOnUser: { where: { userId } },
        },
      },
      users: {
        where: { userId },
      },
    },
  });
  const bestEpisodesOnUserPromise = db.watchedEpisodesOnUser.findMany({
    where: {
      userId,
      episode: {
        ...(cour === null ? {} : generateStartDateQuery(cour).episodes?.some),
      },
    },
    include: {
      episode: {
        include: {
          work: true,
        },
      },
    },
    orderBy: { rating: "desc" },
    take: 30,
  });
  const episodeRatingDistributionPromise = db.watchedEpisodesOnUser.groupBy({
    by: ["rating"],
    where: {
      userId,
      episode: {
        ...(cour === null ? {} : generateStartDateQuery(cour).episodes?.some),
      },
    },
    _count: { rating: true },
  });

  const [
    cours,
    watchingWorks,
    bestEpisodesOnUser,
    quarterMetrics,
    episodeRatingDistribution,
  ] = await Promise.all([
    getCourList(db),
    watchingWorksPromise,
    bestEpisodesOnUserPromise,
    getQuarterMetrics({
      db,
      now:
        cour === null
          ? Temporal.Now.zonedDateTimeISO("Asia/Tokyo")
          : cour2startZonedDateTime(next(cour)).subtract({ milliseconds: 1 }),
      userId,
    })(),
    episodeRatingDistributionPromise,
  ]);
  const filledEpisodeRatingDistribution: Array<{
    rating: number;
    count: number;
  }> = [];
  Array.from({ length: 11 }).forEach((_, i) => {
    filledEpisodeRatingDistribution.push({
      rating: i,
      count:
        episodeRatingDistribution.find((e) => e.rating === i)?._count.rating ??
        0,
    });
  });
  return {
    selectedCourDate: cour && cour2symbol(cour),
    courList: cours.map(
      (cour) =>
        [cour2expression(cour), `${cour.year}${cour.season}`] as [
          string,
          string,
        ],
    ),
    minEpisodes,
    works: watchingWorks.map((work) => ({
      ...work,
      rating: work.episodes
        .map((episode) => episode.WatchedEpisodesOnUser[0]?.rating)
        .filter(isNumber)
        .reduce((acc, val, _, array) => acc + val / array.length, 0),
      complete: work.episodes.filter(
        (episode) => episode.WatchedEpisodesOnUser.length === 1,
      ).length,
    })),
    bestEpisodesOnUser,
    quarterMetrics,
    filledEpisodeRatingDistribution,
  };
};

const Component = () => {
  const {
    courList,
    selectedCourDate,
    works: _w,
    bestEpisodesOnUser,
    quarterMetrics,
    filledEpisodeRatingDistribution,
    minEpisodes: _minEpisodes,
  } = useLoaderData<typeof loader>();
  const [sort, setSort] = useState<"rating" | "complete">("rating");
  const [completeByPublished, setCompleteByPublished] = useState(true);
  const [minEpisodes, setMinEpisodes] = useState(_minEpisodes);
  const works = _w.map((w) => {
    const watchedEpisodesDenominator = completeByPublished
      ? w.episodes.filter((e) => new Date(e.publishedAt) < new Date()).length
      : w.episodes.length;
    return {
      ...w,
      watchedEpisodesDenominator,
      sortKey:
        sort === "rating" ? w.rating : w.complete / watchedEpisodesDenominator,
    };
  });

  const applyEpisodesFilter = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("minEpisodes", minEpisodes.toString());
    location.href = url.toString();
  }, [minEpisodes]);

  return (
    <main className="grid grid-cols-2 gap-4">
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3>作品({works.length})</h3>
          <CourSelect.Component
            courList={[...courList].reverse()}
            defaultSelectedValue={selectedCourDate ?? undefined}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "all") {
                location.href = "/my";
                return;
              }
              location.href = `/my?cour=${value}`;
            }}
          />
          <details className="relative ml-auto">
            <summary className="list-none cursor-pointer p-1 hover:bg-gray-700 rounded">
              <FilterIcon.Component />
            </summary>
            <section className="z-10 absolute left-10 -top-1 shadow-menu bg-dark p-2 rounded flex items-center gap-2 w-max">
              期間内に
              <input
                type="number"
                min="1"
                className="bg-accent-area w-8"
                value={minEpisodes}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (!isNaN(value)) {
                    setMinEpisodes(value);
                  }
                }}
              />
              話以上放送される作品に限定
              <button
                type="button"
                className="bg-accent-area px-2 py-1 rounded"
                onClick={applyEpisodesFilter}
              >
                適用
              </button>
            </section>
          </details>
        </div>

        <section className="flex gap-4">
          <select
            className="bg-accent-area"
            onChange={(e) => {
              // e.target.valueの型を保証する方法がない
              /* eslint @typescript-eslint/no-explicit-any: "warn" */
              setSort(e.target.value as any);
            }}
          >
            <option value="rating">評価が高い順</option>
            <option value="complete">完走率が高い順</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={completeByPublished}
              onChange={(e) => {
                setCompleteByPublished(e.target.checked);
              }}
            ></input>
            完走率を放送済み話数に対して計算する
          </label>
        </section>
        <ul className="flex flex-col gap-2">
          {works
            .sort((a, b) => {
              return b.sortKey - a.sortKey;
            })
            .map((work) => {
              return (
                <li className={`flex gap-4 items-center`} key={work.id}>
                  <meter
                    className="shrink-0"
                    min={0}
                    max={work.watchedEpisodesDenominator}
                    low={work.watchedEpisodesDenominator / 2}
                    value={work.complete}
                    title={`完走率: ${
                      work.episodes.filter(
                        (episode) => episode.WatchedEpisodesOnUser.length === 1,
                      ).length
                    }/${work.watchedEpisodesDenominator}`}
                  >
                    {work.complete}/{work.watchedEpisodesDenominator}
                  </meter>
                  <div>{work.rating.toFixed(1)}</div>
                  <Link to={bindUrlForWorks$WorkId({ workId: work.id })}>
                    {work.title}
                  </Link>
                </li>
              );
            })}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h3>視聴闘争の推移</h3>
        <ResponsiveContainer height={300}>
          <LineChart data={quarterMetrics}>
            <CartesianGrid />
            <XAxis dataKey="date" stroke="#bdc1c6" />
            <YAxis tickCount={5} stroke="#bdc1c6" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="watchAchievements" />
            <Line type="monotone" stroke="red" dataKey="dutyAccumulation" />
          </LineChart>
        </ResponsiveContainer>
        <h3>
          各点数をつけたエピソード数(平均:{" "}
          {(
            filledEpisodeRatingDistribution.reduce((acc, val) => {
              return acc + val.count * val.rating;
            }, 0) /
            filledEpisodeRatingDistribution.reduce((acc, val) => {
              return acc + val.count;
            }, 0)
          ).toFixed(2)}
          )
        </h3>
        <ResponsiveContainer height={300}>
          <BarChart data={filledEpisodeRatingDistribution}>
            <CartesianGrid />
            <XAxis dataKey="rating" stroke="#bdc1c6" domain={[0, 10]} />
            <YAxis stroke="#bdc1c6" />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#81c995" />
          </BarChart>
        </ResponsiveContainer>
        <h3>ベストエピソード</h3>
        <ul className="flex flex-col gap-1">
          {bestEpisodesOnUser.map((e) => {
            return (
              <li
                key={`${e.workId}-${e.episode.count}`}
                className="flex gap-4"
                title={e.comment ?? ""}
              >
                <div className="w-4">{e.rating}</div>
                <div className="flex gap-2">
                  <Link
                    to={bindUrlForWorks$WorkId({
                      workId: e.episode.workId,
                    })}
                  >
                    {e.episode.work.title}
                  </Link>
                  <Link
                    to={bindUrlForWorks$WorkId$Count({
                      workId: e.episode.workId,
                      count: e.count,
                    })}
                  >
                    #{e.episode.count}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
};

export default Component;
