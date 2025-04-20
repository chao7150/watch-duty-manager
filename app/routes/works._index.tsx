import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { useState, useCallback } from "react";

import type { Prisma } from "@prisma/client";
import urlFrom from "url-from";

import type { Cour } from "~/domain/cour/consts";
import { getCourList } from "~/domain/cour/db";
import {
  cour2expression,
  cour2startDate,
  cour2symbol,
  next,
  symbol2cour,
} from "~/domain/cour/util";

import * as CourSelect from "~/components/CourSelect";
import * as FilterIcon from "~/components/Icons/Filter";
import * as WorkUI from "~/components/work/Work";

import { db } from "~/utils/db.server";
import { getUserId } from "~/utils/session.server";

export const bindUrl = urlFrom`/works`.narrowing<{
  "?query": { cour?: string; minEpisodes?: string };
}>;

// my._index.tsx からコピー
const _generateStartDateQuery = (
  cour: Cour | null,
): Prisma.EpisodeWhereInput => {
  if (cour === null) {
    return {};
  }
  const searchDate = cour2startDate(cour);
  const endDate = cour2startDate(next(cour));
  return {
    publishedAt: {
      // 4時始まりは未検討
      gte: searchDate,
      lte: endDate,
    },
  };
};

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

  const workIds = (
    await db.episode.groupBy({
      by: ["workId"],
      where: {
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
  const [minEpisodes, setMinEpisodes] = useState(_minEpisodes); // state で管理

  // フィルター適用処理
  const applyEpisodesFilter = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("minEpisodes", minEpisodes.toString());
    location.href = url.toString();
  }, [minEpisodes]);

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
            url.searchParams.set("minEpisodes", minEpisodes.toString());
            location.href = url.toString();
          }}
        />
        <details className="relative">
          <summary className="list-none cursor-pointer p-1 hover:bg-gray-700 rounded">
            <FilterIcon.Component />
          </summary>
          <section className="z-10 absolute right-0 top-full mt-1 shadow-menu bg-dark p-2 rounded flex items-center gap-2 w-max">
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
