import { Prisma } from "@prisma/client";
import { LoaderArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { addQuarters } from "date-fns";
import { useState } from "react";
import { interval2CourList } from "~/utils/date";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { isNumber } from "~/utils/type";

const generateStartDateQuery = (
  startDate: string | null
): Prisma.WorkWhereInput => {
  if (startDate === null) {
    return {};
  }
  const searchDate = new Date(startDate);
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
  const oldestEpisodePromise = db.episode.findFirstOrThrow({
    select: { publishedAt: true },
    orderBy: { publishedAt: "asc" },
    take: 1,
  });
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
  const [oldestEpisode, watchingWorks] = await Promise.all([
    oldestEpisodePromise,
    watchingWorksPromise,
  ]);
  const cours = interval2CourList(oldestEpisode.publishedAt, new Date());
  return {
    selectedCourDate: cour,
    courList: cours.map(([label, date]) => [label, date.toISOString()]),
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
  };
};

export default function My() {
  const [sort, setSort] = useState<"rating" | "complete">("rating");
  const [completeByPublished, setCompleteByPublished] = useState(true);
  const {
    selectedCourDate,
    courList,
    works: _w,
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
      <h2>あなたの視聴作品リスト</h2>
      <section className="flex gap-4">
        <select
          className="bg-accent-area"
          onChange={(e) => {
            const value = e.target.value;
            if (value === "all") {
              location.href = "/my";
              return;
            }
            location.href = `/my?cour=${value}`;
          }}
        >
          <option value="all">全て</option>
          {courList.map(([label, date]) => {
            return (
              <option value={date} selected={date === selectedCourDate}>
                {label}
              </option>
            );
          })}
        </select>
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
      <section className="mt-4 flex flex-col gap-2">
        <h3>
          {selectedCour ? selectedCour[0] : "不明"}のアニメ(
          {works.length})
        </h3>
        <ul className="flex flex-col gap-2">
          {works
            .sort((a, b) => {
              return b.sortKey - a.sortKey;
            })
            .map((work) => {
              return (
                <li className="flex gap-4 items-center" key={work.id}>
                  <meter
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
                  <Link to={`/works/${work.id}`}>{work.title}</Link>
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}
