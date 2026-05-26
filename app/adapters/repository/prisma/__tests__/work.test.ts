import { describe, expect, it } from "vitest";

import { workRepository } from "~/adapters/repository/prisma/work";
import { db } from "~/utils/db.server";

describe("workRepository", () => {
  describe("create", () => {
    it("作品を作成しOk({ id })を返す", async () => {
      const result = await workRepository.create({
        title: "テスト作品",
        publishedAt: new Date("2024-01-01T04:00:00+09:00"),
      });

      expect(result.ok).toBeDefined();
      expect(typeof result.ok?.id).toBe("number");
      expect(result.err).toBeUndefined();
    });

    it("重複タイトルでunique_constraintエラーを返す", async () => {
      await workRepository.create({
        title: "重複作品",
        publishedAt: new Date("2024-01-01T04:00:00+09:00"),
      });

      const result = await workRepository.create({
        title: "重複作品",
        publishedAt: new Date("2024-02-01T04:00:00+09:00"),
      });

      expect(result.err?.type).toBe("unique_constraint");
    });
  });

  describe("findById", () => {
    it("includeEpisodes: true でエピソードが紐づいて取得できる", async () => {
      const { ok: createResult } = await workRepository.create({
        title: "エピソード付き作品",
        publishedAt: new Date("2024-01-01T04:00:00+09:00"),
      });
      // biome-ignore lint/style/noNonNullAssertion: test
      const workId = createResult!.id;

      await db.episode.createMany({
        data: [
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
        ],
      });

      const work = await workRepository.findById(workId, {
        includeEpisodes: true,
      });

      expect(work).not.toBeNull();
      expect(work?.episodes).toHaveLength(2);
      expect(work?.episodes?.[0].count).toBe(1);
      expect(work?.episodes?.[1].count).toBe(2);
    });

    it("includeEpisodes: false ではエピソードを含まない", async () => {
      const { ok: createResult } = await workRepository.create({
        title: "エピソードなしで取得",
        publishedAt: new Date("2024-01-01T04:00:00+09:00"),
      });
      // biome-ignore lint/style/noNonNullAssertion: test
      const workId = createResult!.id;

      const work = await workRepository.findById(workId, {
        includeEpisodes: false,
      });

      expect(work).not.toBeNull();
      expect(work?.episodes).toBeUndefined();
    });
  });

  describe("createMany", () => {
    it("複数の作品を作成できる", async () => {
      const result = await workRepository.createMany([
        {
          title: "一括作成1",
          publishedAt: new Date("2024-01-01T04:00:00+09:00"),
        },
        {
          title: "一括作成2",
          publishedAt: new Date("2024-02-01T04:00:00+09:00"),
        },
      ]);

      expect(result.err).toBeUndefined();
    });

    it("重複タイトルでunique_constraintエラーを返す", async () => {
      await workRepository.createMany([
        {
          title: "一括重複",
          publishedAt: new Date("2024-01-01T04:00:00+09:00"),
        },
      ]);

      const result = await workRepository.createMany([
        {
          title: "一括重複",
          publishedAt: new Date("2024-02-01T04:00:00+09:00"),
        },
      ]);

      expect(result.err?.type).toBe("unique_constraint");
    });
  });

  describe("update", () => {
    it("作品のタイトルを更新できる", async () => {
      const { ok: createResult } = await workRepository.create({
        title: "更新前タイトル",
        publishedAt: new Date("2024-01-01T04:00:00+09:00"),
      });
      // biome-ignore lint/style/noNonNullAssertion: test
      const workId = createResult!.id;

      const result = await workRepository.update(workId, {
        title: "更新後タイトル",
      });

      expect(result.ok?.title).toBe("更新後タイトル");

      const updated = await workRepository.findById(workId, {
        includeEpisodes: false,
      });
      expect(updated?.title).toBe("更新後タイトル");
    });
  });

  describe("findManyByIds", () => {
    it("指定したIDの作品一覧を返す", async () => {
      const { ok: r1 } = await workRepository.create({
        title: "findMany1",
        publishedAt: new Date("2024-01-01T04:00:00+09:00"),
      });
      const { ok: r2 } = await workRepository.create({
        title: "findMany2",
        publishedAt: new Date("2024-02-01T04:00:00+09:00"),
      });

      // biome-ignore lint/style/noNonNullAssertion: test
      const works = await workRepository.findManyByIds([r1!.id, r2!.id], {});

      expect(works).toHaveLength(2);
      expect(works.map((w) => w.title)).toEqual(
        expect.arrayContaining(["findMany1", "findMany2"]),
      );
    });
  });
});
