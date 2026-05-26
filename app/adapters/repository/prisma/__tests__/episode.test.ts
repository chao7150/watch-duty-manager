import { describe, expect, it } from "vitest";

import { episodeRepository } from "~/adapters/repository/prisma/episode";
import { workRepository } from "~/adapters/repository/prisma/work";
import { db } from "~/utils/db.server";

const createWorkWithEpisodes = async (title: string, episodeDates: Date[]) => {
  const { ok: work } = await workRepository.create({
    title,
    publishedAt: episodeDates[0],
  });
  // biome-ignore lint/style/noNonNullAssertion: test
  const workId = work!.id;

  await db.episode.createMany({
    data: episodeDates.map((date, index) => ({
      workId,
      count: index + 1,
      publishedAt: date,
    })),
  });

  return workId;
};

describe("episodeRepository", () => {
  describe("createMany", () => {
    it("エピソードを一括作成し作成件数を返す", async () => {
      const { ok: work } = await workRepository.create({
        title: "エピソード一括作成",
        publishedAt: new Date("2024-01-01T04:00:00+09:00"),
      });
      // biome-ignore lint/style/noNonNullAssertion: test
      const workId = work!.id;

      const result = await episodeRepository.createMany([
        {
          workId,
          count: 1,
          publishedAt: new Date("2024-01-08T04:00:00+09:00"),
        },
        {
          workId,
          count: 2,
          publishedAt: new Date("2024-01-15T04:00:00+09:00"),
        },
        {
          workId,
          count: 3,
          publishedAt: new Date("2024-01-22T04:00:00+09:00"),
        },
      ]);

      expect(result.ok?.count).toBe(3);
    });
  });

  describe("findOldestPublishedAt", () => {
    it("最も古いpublishedAtを返す", async () => {
      await createWorkWithEpisodes("最古エピソードテスト", [
        new Date("2024-02-01T04:00:00+09:00"),
        new Date("2024-01-15T04:00:00+09:00"),
        new Date("2024-03-01T04:00:00+09:00"),
      ]);

      const oldest = await episodeRepository.findOldestPublishedAt();

      expect(oldest.getTime()).toBe(
        new Date("2024-01-15T04:00:00+09:00").getTime(),
      );
    });
  });

  describe("deleteAndReorder", () => {
    it("指定したエピソードを削除し後続のcountを詰める", async () => {
      const workId = await createWorkWithEpisodes(
        "エピソード削除リオーダーテスト",
        [
          new Date("2024-01-08T04:00:00+09:00"),
          new Date("2024-01-15T04:00:00+09:00"),
          new Date("2024-01-22T04:00:00+09:00"),
        ],
      );

      const result = await episodeRepository.deleteAndReorder(workId, 2);

      expect(result.err).toBeUndefined();

      const remaining = await db.episode.findMany({
        where: { workId },
        orderBy: { count: "asc" },
      });
      expect(remaining).toHaveLength(2);
      expect(remaining[0].count).toBe(1);
      expect(remaining[1].count).toBe(2);
      expect(remaining[1].publishedAt).toEqual(
        new Date("2024-01-22T04:00:00+09:00"),
      );
    });
  });

  describe("groupByWorkIdWithCount", () => {
    it("指定条件を満たすworkIdを返す", async () => {
      const workId1 = await createWorkWithEpisodes("グループ化テスト1", [
        new Date("2024-01-08T04:00:00+09:00"),
        new Date("2024-01-15T04:00:00+09:00"),
      ]);
      const workId2 = await createWorkWithEpisodes("グループ化テスト2", [
        new Date("2024-02-01T04:00:00+09:00"),
      ]);

      const result = await episodeRepository.groupByWorkIdWithCount(
        { workId: { in: [workId1, workId2] } },
        2,
      );

      expect(result).toStrictEqual([workId1]);
    });
  });
});
