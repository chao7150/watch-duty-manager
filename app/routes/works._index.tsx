import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import urlFrom from "url-from";

import { Cour } from "~/domain/cour/consts";
import { getCourList } from "~/domain/cour/db";
import {
  cour2expression,
  cour2startDate,
  cour2symbol,
  next,
  symbol2cour,
} from "~/domain/cour/util";

import * as CourSelect from "~/components/CourSelect";
import * as WorkUI from "~/components/Work/Work";

import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";

export const bindUrl = urlFrom`/works`.narrowing<{
  "?query": { cour?: string };
}>;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const userId = await getUserId(request);
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
    selectedCourDate: cour && cour2symbol(cour),
    courList: cours.map(
      (cour) =>
        [cour2expression(cour), `${cour.year}${cour.season}`] as [
          string,
          string
        ]
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
        courList={[...courList].reverse()}
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
                  id={work.id}
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
