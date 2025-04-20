import type { Prisma, PrismaClient } from "@prisma/client";
import { Temporal } from "temporal-polyfill";

import type { Cour } from "~/domain/cour/consts";
import { cour2startDate, next } from "~/domain/cour/util";

import { zdt2Date } from "~/utils/date";

/**
 * クールに基づいてエピソードをフィルタリングするためのクエリを生成します
 * @param cour - フィルタリングするクール、nullの場合は制限なし
 * @returns エピソードのフィルタリング条件
 */
export const generateEpisodeDateQuery = (
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

/**
 * クールに基づいて作品をフィルタリングするためのクエリを生成します
 * @param cour - フィルタリングするクール、nullの場合は制限なし
 * @returns 作品のフィルタリング条件
 */
export const generateWorkDateQuery = (
  cour: Cour | null,
): Prisma.WorkWhereInput => {
  if (cour === null) {
    return {};
  }
  const searchDate = cour2startDate(cour);
  // Date を Temporal.ZonedDateTime に変換し、3ヶ月後の日付を計算
  const endDate = zdt2Date(
    Temporal.Instant.fromEpochMilliseconds(searchDate.getTime())
      .toZonedDateTimeISO("Asia/Tokyo")
      .add({ months: 3 }),
  );
  return {
    episodes: {
      some: {
        publishedAt: {
          // 4時始まりは未検討
          gte: searchDate,
          lte: endDate,
        },
      },
    },
  };
};

/**
 * 最低話数以上のエピソードを持つ作品IDを取得するためのクエリを生成します
 * @param db - Prismaデータベースインスタンス
 * @param cour - フィルタリングするクール、nullの場合は制限なし
 * @param minEpisodes - 最低話数
 * @param additionalWhere - 追加のフィルタリング条件
 * @returns 作品IDを取得するためのクエリ
 */
export const getWorkIdsWithMinEpisodes = async (
  db: PrismaClient,
  cour: Cour | null,
  minEpisodes: number,
  additionalWhere: Prisma.EpisodeWhereInput = {},
) => {
  return (
    await db.episode.groupBy({
      by: ["workId"],
      where: {
        ...generateEpisodeDateQuery(cour),
        ...additionalWhere,
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
  ).map((e: { workId: number }) => e.workId);
};
