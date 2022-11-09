import { Prisma } from "@prisma/client";
import { LoaderArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { addQuarters } from "date-fns";
import { interval2CourList } from "~/utils/date";
import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";

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
  });
  const [oldestEpisode, watchingWorks] = await Promise.all([
    oldestEpisodePromise,
    watchingWorksPromise,
  ]);
  const cours = interval2CourList(oldestEpisode.publishedAt, new Date());
  return {
    courList: cours.map(([label, date]) => [label, date.toISOString()]),
    works: watchingWorks,
  };
};

export default function My() {
  const { courList, works } = useLoaderData<typeof loader>();
  return (
    <div>
      <ul>
        <li key="all">
          <a href="/my2">全て</a>
        </li>
        {courList.map(([label, date]) => {
          return (
            <li key={label}>
              <a href={`/my2?cour=${date}`}>{label}</a>
            </li>
          );
        })}
      </ul>
      <ul>
        {works.map((work) => {
          return <li key={work.id}>{work.title}</li>;
        })}
      </ul>
    </div>
  );
}
