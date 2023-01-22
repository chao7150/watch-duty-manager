import { useLoaderData } from "@remix-run/react";
import { LoaderArgs } from "@remix-run/node";
import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";
import * as WorkUI from "~/components/Work/Work";
import {
  cour2expression,
  cour2startDate,
  isCour,
  next,
} from "~/domain/cour/util";
import { getCourList } from "~/domain/cour/db";
import { Cour } from "~/domain/cour/consts";
import * as CourSelect from "~/components/CourSelect";

export const loader = async ({ request }: LoaderArgs) => {
  const url = new URL(request.url);
  const userId = await getUserId(request);
  const cour = url.searchParams.get("cour");
  if (cour !== null && !isCour(cour)) {
    throw new Error("cour is invalid.");
  }
  const worksPromise = db.work.findMany({
    ...(cour
      ? {
          where: {
            episodes: {
              some: {
                AND: [
                  {
                    publishedAt: {
                      gte: cour2startDate(cour),
                      lt: cour2startDate(next(cour)),
                    },
                  },
                ],
              },
            },
          },
        }
      : {}),
    include: {
      // 非ログイン時は0件ヒットにするために空文字で検索
      users: { where: { userId: userId ?? "" } },
      episodes: { where: { count: 1 } },
    },
    orderBy: { id: "asc" },
  });
  const [works, cours] = await Promise.all([worksPromise, getCourList(db)]);
  return {
    works,
    loggedIn: userId !== undefined,
    selectedCourDate: cour,
    courList: cours.map(
      (cour) => [cour2expression(cour), cour] as [string, Cour]
    ),
  };
};

export default function Works() {
  const loaderData = useLoaderData<typeof loader>();
  const { works, loggedIn, courList, selectedCourDate } = loaderData;
  return (
    <div>
      <h2>作品リスト</h2>
      <CourSelect.Component
        courList={courList.reverse()}
        defaultSelectedValue={selectedCourDate ?? undefined}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "all") {
            location.href = "/works";
            return;
          }
          location.href = `/works?cour=${value}`;
        }}
      />
      <section className="mt-4">
        <h3>
          作品(<span>{works.length}</span>)
        </h3>
        <ul className="grid grid-cols-2 gap-1">
          {works.map((work) => {
            return (
              <li key={work.id}>
                <WorkUI.Component
                  loggedIn={loggedIn}
                  id={work.id.toString()}
                  title={work.title}
                  subscribed={work.users.length === 1}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
