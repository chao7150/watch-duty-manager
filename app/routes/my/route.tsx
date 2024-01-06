import { Prisma } from "@prisma/client";
import { ActionFunctionArgs, LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { addQuarters } from "date-fns";

import { db } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { isNumber } from "~/utils/type";
import * as CourSelect from "~/components/CourSelect";
import { getCourList } from "~/domain/cour/db";
import {
  cour2expression,
  cour2startDate,
  cour2symbol,
  next,
  symbol2cour,
} from "~/domain/cour/util";
import { Cour } from "~/domain/cour/consts";
import { getQuarterMetrics } from "../_index";
import urlFrom from "url-from";
import * as TabPanel from "../../components/TabPanel";

import * as Dashboard from "./Dashboard";
import * as PersonalTag from "./PersonalTag";

export const bindUrl = urlFrom`/my`.narrowing<{ "?query": { cour?: string } }>;

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

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
      users: {
        include: {
          TagsOnSubscription: { include: { tag: true } },
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
  const episodeRatingDistributionPromise = db.watchedEpisodesOnUser.groupBy({
    by: ["rating"],
    where: {
      userId,
      episode: {
        ...(cour === null ? {} : generateStartDateQuery(cour).episodes?.some),
      },
    },
    _count: { rating: true },
  });
  const tagsOnUserPromise = db.tag.findMany({
    where: {
      userId,
    },
  });

  const [
    cours,
    watchingWorks,
    bestEpisodesOnUser,
    quarterMetrics,
    episodeRatingDistribution,
    tagsOnUser,
  ] = await Promise.all([
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
    episodeRatingDistributionPromise,
    tagsOnUserPromise,
  ]);
  const filledEpisodeRatingDistribution: Array<{
    rating: number;
    count: number;
  }> = [];
  Array.from({ length: 11 }).forEach((_, i) => {
    filledEpisodeRatingDistribution.push({
      rating: i,
      count:
        episodeRatingDistribution.find((e) => e.rating === i)?._count.rating ??
        0,
    });
  });
  return {
    selectedCourDate: cour && cour2symbol(cour),
    courList: cours.map(
      (cour) =>
        [cour2expression(cour), `${cour.year}${cour.season}`] as [
          string,
          string
        ]
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
    filledEpisodeRatingDistribution,
    tagsOnUser,
  };
};

export type ActionData = {
  successMessage?: string;
  errorMessage?: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  if (formData.get("_action") === "createPersonalTag") {
    const userId = await requireUserId(request);
    const text = formData.get("text");
    if (typeof text !== "string" || text === "") {
      return json(
        { errorMessage: "text must not be empty" } satisfies ActionData,
        { status: 400 }
      );
    }
    try {
      const res = await db.tag.create({
        data: {
          text,
          userId,
        },
      });
      return json({
        successMessage: `${res.text}の登録に成功しました`,
      } satisfies ActionData);
    } catch (e) {
      console.log(e);
      return json(
        { errorMessage: "不明なエラーが発生しました" } satisfies ActionData,
        { status: 500 }
      );
    }
  }
};

export default function My() {
  const {
    selectedCourDate,
    courList,
    works: _w,
    bestEpisodesOnUser,
    quarterMetrics,
    filledEpisodeRatingDistribution,
    tagsOnUser,
  } = useLoaderData<typeof loader>();

  return (
    <div>
      <header className="flex gap-4">
        <h2>マイページ</h2>
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
      </header>
      <TabPanel.Component
        items={[
          {
            id: "dashboard",
            tabText: "ダッシュボード",
            content: (
              <Dashboard.Component
                works={_w}
                quarterMetrics={quarterMetrics}
                filledEpisodeRatingDistribution={
                  filledEpisodeRatingDistribution
                }
                bestEpisodesOnUser={bestEpisodesOnUser}
              />
            ),
          },
          {
            id: "tag",
            tabText: "パーソナルタグ",
            content: <PersonalTag.Component tagsOnUser={tagsOnUser} />,
          },
        ]}
      />
    </div>
  );
}
