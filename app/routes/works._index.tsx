import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import urlFrom from "url-from";

import type { Cour } from "~/domain/cour/consts";
import { getCourList } from "~/domain/cour/db";
import { cour2expression, cour2symbol, symbol2cour } from "~/domain/cour/util";
import { getWorkIdsWithMinEpisodes } from "~/domain/episode/filter";

import * as CourSelect from "~/components/CourSelect";
import * as EpisodeFilter from "~/components/EpisodeFilter";
import * as WorkUI from "~/components/work/Work";

import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";

export const bindUrl = urlFrom`/works`.narrowing<{
  "?query": { cour?: string; minEpisodes?: string };
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
  const minEpisodes = Number(url.searchParams.get("minEpisodes") ?? "3");

  const workIds = await getWorkIdsWithMinEpisodes(db, cour, minEpisodes);

  // workIds で絞り込んで作品情報を取得
  const worksPromise = db.work.findMany({
    where: {
      id: { in: workIds }, // workIds で絞り込み
    },
    include: {
      // 非ログイン時は0件ヒットにするために空文字で検索
      users: { where: { userId: userId ?? "" } },
      episodes: { where: { count: 1 } }, // 初回エピソード取得用
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
          string,
        ],
    ),
    minEpisodes,
  };
};

export default function Works() {
  const loaderData = useLoaderData<typeof loader>();
  const {
    works,
    loggedIn,
    courList,
    selectedCourDate,
    minEpisodes: _minEpisodes,
  } = loaderData;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2>作品リスト</h2>
        <CourSelect.Component
          courList={[...courList].reverse()}
          defaultSelectedValue={selectedCourDate ?? undefined}
          onChange={(e) => {
            const value = e.target.value;
            const url = new URL(window.location.href);
            if (value === "all") {
              url.searchParams.delete("cour");
            } else {
              url.searchParams.set("cour", value);
            }
            // minEpisodes は維持する
            url.searchParams.set("minEpisodes", _minEpisodes.toString());
            location.href = url.toString();
          }}
        />
        <EpisodeFilter.Component initialMinEpisodes={_minEpisodes} />
      </div>
      <section>
        <h3>
          作品(<span>{works.length}</span>)
        </h3>
        <ul className="grid grid-cols-2 gap-1 mt-2">
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
