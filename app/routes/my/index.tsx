import { Prisma } from "@prisma/client";
import { LoaderArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { addQuarters } from "date-fns";
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";
import { getQuarterMetrics } from "..";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { isNumber } from "~/utils/type";
import * as CourSelect from "~/components/CourSelect";
import { getCourList } from "~/domain/cour/db";
import {
  cour2expression,
  cour2startDate,
  isCour,
  next,
} from "~/domain/cour/util";
import { Cour } from "~/domain/cour/consts";

const generateStartDateQuery = (cour: Cour | null): Prisma.WorkWhereInput => {
  if (cour === null) {
    return {};
  }
  const searchDate = cour2startDate(cour);
  return {
    episodes: {
      some: {
        publishedAt: {
          // 4時始まりは未検討
          gte: searchDate,
          lte: addQuarters(searchDate, 1),
        },
      },
    },
  };
};

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const cour = url.searchParams.get("cour");
  if (cour !== null && !isCour(cour)) {
    throw new Error("cour is invalid.");
  }
  const watchingWorksPromise = db.work.findMany({
    where: {
      users: { some: { userId } },
      ...generateStartDateQuery(cour),
    },
    include: {
      episodes: {
        include: {
          WatchedEpisodesOnUser: { where: { userId } },
        },
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

  const [cours, watchingWorks, bestEpisodesOnUser, quarterMetrics] =
    await Promise.all([
      getCourList(db),
      watchingWorksPromise,
      bestEpisodesOnUserPromise,
      getQuarterMetrics({
        db,
        now:
          cour === null
            ? new Date()
            : new Date(cour2startDate(next(cour)).getTime() - 1),
        userId,
      })(),
    ]);
  return {
    selectedCourDate: cour,
    courList: cours.map(
      (cour) => [cour2expression(cour), cour] as [string, Cour]
    ),
    works: watchingWorks.map((work) => ({
      ...work,
      rating: work.episodes
        .map((episode) => episode.WatchedEpisodesOnUser[0]?.rating)
        .filter(isNumber)
        .reduce((acc, val, _, array) => acc + val / array.length, 0),
      complete: work.episodes.filter(
        (episode) => episode.WatchedEpisodesOnUser.length === 1
      ).length,
    })),
    bestEpisodesOnUser,
    quarterMetrics,
  };
};

export default function My() {
  const [sort, setSort] = useState<"rating" | "complete">("rating");
  const [completeByPublished, setCompleteByPublished] = useState(true);
  const {
    selectedCourDate,
    courList,
    works: _w,
    bestEpisodesOnUser,
    quarterMetrics,
  } = useLoaderData<typeof loader>();
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
  const selectedCour = courList.find((cour) => cour[1] === selectedCourDate);
  return (
    <div>
      <header className="flex gap-4">
        <h2>マイページ</h2>
        <CourSelect.Component
          courList={courList.reverse()}
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
      </header>
      <main className="mt-4 grid grid-cols-2 gap-4">
        <section className="flex flex-col gap-2">
          <h3>
            作品(
            {works.length})
          </h3>
          <section className="flex gap-4">
            <select
              className="bg-accent-area"
              onChange={(e) => {
                // e.target.valueの型を保証する方法がない
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
                  <li className="flex gap-4 items-center" key={work.id}>
                    <meter
                      className="shrink-0"
                      min={0}
                      max={work.watchedEpisodesDenominator}
                      low={work.watchedEpisodesDenominator / 2}
                      value={work.complete}
                      title={`完走率: ${
                        work.episodes.filter(
                          (episode) =>
                            episode.WatchedEpisodesOnUser.length === 1
                        ).length
                      }/${work.watchedEpisodesDenominator}`}
                    >
                      {work.complete}/{work.watchedEpisodesDenominator}
                    </meter>
                    <div>{work.rating.toFixed(1)}</div>
                    <Link to={`/works/${work.id}`}>{work.title}</Link>
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
          <h3>ベストエピソード</h3>
          <ul className="flex flex-col gap-1">
            {bestEpisodesOnUser.map((e) => {
              return (
                <li className="flex gap-4" title={e.comment ?? ""}>
                  <div className="w-4">{e.rating}</div>
                  <div className="flex gap-2">
                    <Link to={`/works/${e.episode.workId}`}>
                      {e.episode.work.title}
                    </Link>
                    <Link to={`/works/${e.episode.workId}/${e.count}`}>
                      #{e.episode.count}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
