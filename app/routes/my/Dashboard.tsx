import { Link, type useLoaderData } from "@remix-run/react";
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
import { bindUrl as bindUrlForWorks$WorkId } from "../works.$workId";
import { bindUrl as bindUrlForWorks$WorkId$Count } from "../works.$workId.$count";
import type { loader } from "./route";
import { useState } from "react";
import * as Tag from "../../components/Tag";

type Props = Pick<
  ReturnType<typeof useLoaderData<ReturnType<typeof loader>>>,
  | "works"
  | "quarterMetrics"
  | "filledEpisodeRatingDistribution"
  | "bestEpisodesOnUser"
>;

export const Component: React.FC<Props> = ({
  works: _w,
  quarterMetrics,
  filledEpisodeRatingDistribution,
  bestEpisodesOnUser,
}) => {
  const [sort, setSort] = useState<"rating" | "complete">("rating");
  const [completeByPublished, setCompleteByPublished] = useState(true);
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
  return (
    <main className="grid grid-cols-2 gap-4">
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
                        (episode) => episode.WatchedEpisodesOnUser.length === 1
                      ).length
                    }/${work.watchedEpisodesDenominator}`}
                  >
                    {work.complete}/{work.watchedEpisodesDenominator}
                  </meter>
                  <div>{work.rating.toFixed(1)}</div>
                  <Link to={bindUrlForWorks$WorkId({ workId: work.id })}>
                    {work.title}
                  </Link>
                  <ul className="flex gap-2">
                    {work.users[0].TagsOnSubscription.map((tos) => {
                      return (
                        <li>
                          <Tag.Component
                            text={tos.tag.text}
                            href={tos.tag.id.toString()}
                          />
                        </li>
                      );
                    })}
                  </ul>
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
              <li className="flex gap-4" title={e.comment ?? ""}>
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
