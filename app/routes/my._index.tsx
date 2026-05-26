import { useState } from "react";
import { Link } from "react-router";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { episodeRepository } from "~/adapters/repository/prisma/episode";
import { metricsRepository } from "~/adapters/repository/prisma/metrics";
import { watchRepository } from "~/adapters/repository/prisma/watch";
import * as CourSelect from "~/components/CourSelect";
import * as EpisodeFilter from "~/components/EpisodeFilter";
import type { Cour } from "~/domain/cour/consts";
import { symbol2cour } from "~/domain/cour/util";
import { getMyDashboard } from "~/usecases/getMyDashboard";
import { requireUserId } from "~/utils/session.server";
import type { Route } from "./+types/my._index";
import { bindUrl as bindUrlForWorks$WorkId } from "./works.$workId/route";
import { bindUrl as bindUrlForWorks$WorkId$Count } from "./works.$workId.$count";

export const loader = async ({ request }: Route.LoaderArgs) => {
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

  const result = await getMyDashboard({
    episodeRepo: episodeRepository,
    watchRepo: watchRepository,
    metricsRepo: metricsRepository,
  })({
    userId,
    cour,
    minEpisodes,
  });

  return {
    selectedCourDate: result.selectedCourDate ?? undefined,
    courList: result.courList,
    minEpisodes: result.minEpisodes,
    works: result.works,
    bestEpisodesOnUser: result.bestEpisodesOnUser,
    quarterMetrics: result.quarterMetrics,
    filledEpisodeRatingDistribution: result.filledEpisodeRatingDistribution,
  };
};

const Component = ({ loaderData }: Route.ComponentProps) => {
  const {
    courList,
    selectedCourDate,
    works: _w,
    bestEpisodesOnUser,
    quarterMetrics,
    filledEpisodeRatingDistribution,
    minEpisodes: _minEpisodes,
  } = loaderData;
  const [sort, setSort] = useState<"rating" | "complete">("rating");
  const [completeByPublished, setCompleteByPublished] = useState(true);
  const works = _w.map((w) => {
    const denominator = completeByPublished
      ? w.watchedEpisodesDenominator
      : w.episodes.length;
    return {
      ...w,
      denominator,
      sortKey: sort === "rating" ? w.rating : w.complete / denominator,
    };
  });

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
          <div>
            <EpisodeFilter.Component initialMinEpisodes={_minEpisodes} />
          </div>
        </div>

        <section className="flex gap-4">
          <select
            className="bg-accent-area"
            onChange={(e) => {
              // e.target.valueの型を保証する方法がないのでasで妥協
              setSort(e.target.value as "rating" | "complete");
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
                    max={work.denominator}
                    low={work.denominator / 2}
                    value={work.complete}
                    title={`完走率: ${work.complete}/${work.denominator}`}
                  >
                    {work.complete}/{work.denominator}
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
