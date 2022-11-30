import { Prisma } from "@prisma/client";
import { LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { addQuarters } from "date-fns";
import { interval2CourList } from "~/utils/date";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import * as WorkUI from "~/components/Work/Work";

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
      episodes: { include: { WatchedEpisodesOnUser: { where: { userId } } } },
    },
  });
  const [oldestEpisode, watchingWorks] = await Promise.all([
    oldestEpisodePromise,
    watchingWorksPromise,
  ]);
  const cours = interval2CourList(oldestEpisode.publishedAt, new Date());
  return {
    selectedCour: cour,
    courList: cours.map(([label, date]) => [label, date.toISOString()]),
    works: watchingWorks,
  };
};

export default function My() {
  const { selectedCour, courList, works } = useLoaderData<typeof loader>();
  return (
    <div>
      <select
        onChange={(e) => {
          const value = e.target.value;
          if (value === "all") {
            location.href = "/my2";
            return;
          }
          location.href = `/my2?cour=${value}`;
        }}
      >
        <option value="all">全て</option>
        {courList.map(([label, date]) => {
          return (
            <option value={date} selected={date === selectedCour}>
              {label}
            </option>
          );
        })}
      </select>
      <ul>
        {works.map((work) => {
          return (
            <li className="mt-1" key={work.id}>
              <meter
                min={0}
                max={work.episodes.length}
                value={
                  work.episodes.filter(
                    (episode) => episode.WatchedEpisodesOnUser.length === 1
                  ).length
                }
                title={`完走率: ${
                  work.episodes.filter(
                    (episode) => episode.WatchedEpisodesOnUser.length === 1
                  ).length
                }/${work.episodes.length}`}
              >
                {
                  work.episodes.filter(
                    (episode) => episode.WatchedEpisodesOnUser.length === 1
                  ).length
                }
                /{work.episodes.length}
              </meter>
              <WorkUI.Component
                loggedIn={true}
                id={work.id.toString()}
                title={work.title}
                subscribed={true}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
