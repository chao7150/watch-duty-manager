import { describe, expect, it } from "vitest";

import { episodeRepository } from "~/adapters/repository/prisma/episode";
import { workRepository } from "~/adapters/repository/prisma/work";

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
      const workId = createResult!.id;

      await episodeRepository.createMany([
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
      ]);

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

      const works = await workRepository.findManyByIds([r1!.id, r2!.id], {});

      expect(works).toHaveLength(2);
      expect(works.map((w) => w.title)).toEqual(
        expect.arrayContaining(["findMany1", "findMany2"]),
      );
    });
  });

  describe("findAll", () => {
    it("作品の一覧を返し、作成や更新でキャッシュがクリアされる", async () => {
      // 1. 初回の取得 (DBから取得してキャッシュ)
      await workRepository.findAll();

      // 2. 新規追加
      const { ok: r1 } = await workRepository.create({
        title: "キャッシュ検証1",
        publishedAt: new Date("2024-01-01T04:00:00+09:00"),
      });

      // 3. 取得 (キャッシュがクリアされて新しい作品が含まれるはず)
      const afterCreateWorks = await workRepository.findAll();
      expect(afterCreateWorks.map((w) => w.title)).toContain("キャッシュ検証1");

      // 4. 更新
      await workRepository.update(r1!.id, {
        title: "キャッシュ検証更新後",
      });

      // 5. 取得 (キャッシュがクリアされて更新後のタイトルになっているはず)
      const afterUpdateWorks = await workRepository.findAll();
      expect(afterUpdateWorks.map((w) => w.title)).toContain(
        "キャッシュ検証更新後",
      );
      expect(afterUpdateWorks.map((w) => w.title)).not.toContain(
        "キャッシュ検証1",
      );
    });
  });
});
