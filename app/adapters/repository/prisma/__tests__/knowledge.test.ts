import { describe, expect, it } from "vitest";
import { episodeRepository } from "~/adapters/repository/prisma/episode";
import { knowledgeRepository } from "~/adapters/repository/prisma/knowledge";
import { workRepository } from "~/adapters/repository/prisma/work";
import { db } from "~/utils/db.server";

describe("knowledgeRepository", () => {
  describe("createNode", () => {
    it("純粋な知識ノードを作成できる", async () => {
      const result = await knowledgeRepository.createNode({
        name: "テスト知識ノード",
        content: "テスト説明文",
      });

      expect(result.ok).toBeDefined();
      expect(typeof result.ok?.id).toBe("number");
      expect(result.err).toBeUndefined();

      const createdNode = await knowledgeRepository.findById(result.ok!.id);
      expect(createdNode).not.toBeNull();
      expect(createdNode?.label).toBe("テスト知識ノード");
      expect(createdNode?.content).toBe("テスト説明文");
      expect(createdNode?.kind).toBe("knowledge");
    });

    it("空文字の名前でvalidationエラーになる", async () => {
      const result = await knowledgeRepository.createNode({
        name: "   ",
      });

      expect(result.err?.type).toBe("validation");
    });
  });

  describe("updateNode", () => {
    it("純粋な知識ノードを更新できる", async () => {
      const { ok: node } = await knowledgeRepository.createNode({
        name: "編集前",
        content: "説明前",
      });

      const result = await knowledgeRepository.updateNode(node!.id, {
        name: "編集後",
        content: "説明後",
      });

      expect(result.err).toBeUndefined();

      const updated = await knowledgeRepository.findById(node!.id);
      expect(updated?.label).toBe("編集後");
      expect(updated?.content).toBe("説明後");
    });

    it("Work由来のノードは更新できずvalidationエラーになる", async () => {
      const { ok: work } = await workRepository.create({
        title: "Work由来ノード編集不可テスト",
        publishedAt: new Date("2024-01-01T04:00:00+09:00"),
      });

      const workDetail = await workRepository.findById(work!.id, {});
      const result = await knowledgeRepository.updateNode(
        workDetail!.knowledgeNodeId,
        {
          name: "書き換えテスト",
        },
      );

      expect(result.err?.type).toBe("validation");
      if (result.err?.type === "validation") {
        expect(result.err.message).toContain("編集できません");
      }
    });

    // TODO: 空文字でのvalidationエラーが返らない問題がある（not_foundエラーになる）
    it("空文字の名前でvalidationエラーになる", async () => {
      const { ok: node } = await knowledgeRepository.createNode({
        name: "空文字テスト用",
      });

      const result = await knowledgeRepository.updateNode(node!.id, {
        name: "   ",
      });

      expect(result.err?.type).toBe("validation");
    });
  });

  describe("deleteNode", () => {
    // TODO: 削除後もfindByIdがノードを返す問題がある（削除ができていない可能性）
    it("純粋な知識ノードを削除すると紐づくエッジもカスケード削除される", async () => {
      const { ok: node1 } = await knowledgeRepository.createNode({
        name: "ノード1",
      });
      const { ok: node2 } = await knowledgeRepository.createNode({
        name: "ノード2",
      });

      await knowledgeRepository.createEdge({
        fromId: node1!.id,
        toId: node2!.id,
        edgeType: "relates_to",
      });

      // 削除実行
      const deleteResult = await knowledgeRepository.deleteNode(node1!.id);
      expect(deleteResult.err).toBeUndefined();

      // ノードが消えていることを確認
      const fetched = await knowledgeRepository.findById(node1!.id);
      expect(fetched).toBeNull();

      // 紐づいていたエッジが消えていることを確認 (DB上でエッジ数が0になっている)
      const edgeCount = await db.knowledgeEdge.count({
        where: {
          OR: [{ fromId: node1!.id }, { toId: node1!.id }],
        },
      });
      expect(edgeCount).toBe(0);
    });

    it("Work由来のノードは削除できずvalidationエラーになる", async () => {
      const { ok: work } = await workRepository.create({
        title: "Work由来ノード削除不可テスト",
        publishedAt: new Date("2024-01-01T04:00:00+09:00"),
      });

      const workDetail = await workRepository.findById(work!.id, {});
      const result = await knowledgeRepository.deleteNode(
        workDetail!.knowledgeNodeId,
      );

      expect(result.err?.type).toBe("validation");
      if (result.err?.type === "validation") {
        expect(result.err.message).toContain("削除できません");
      }
    });
  });

  describe("createEdge", () => {
    it("エッジを作成し、findByIdで近傍を取得できる", async () => {
      const { ok: node1 } = await knowledgeRepository.createNode({
        name: "発信元",
      });
      const { ok: node2 } = await knowledgeRepository.createNode({
        name: "受信先",
      });

      const result = await knowledgeRepository.createEdge({
        fromId: node1!.id,
        toId: node2!.id,
        edgeType: "test_relation",
      });

      expect(result.err).toBeUndefined();

      // 発信元の近傍確認
      const detail1 = await knowledgeRepository.findById(node1!.id);
      expect(detail1?.outgoing).toHaveLength(1);
      expect(detail1?.outgoing[0].node.id).toBe(node2!.id);
      expect(detail1?.outgoing[0].edgeType).toBe("test_relation");

      // 受信先の近傍確認
      const detail2 = await knowledgeRepository.findById(node2!.id);
      expect(detail2?.incoming).toHaveLength(1);
      expect(detail2?.incoming[0].node.id).toBe(node1!.id);
      expect(detail2?.incoming[0].edgeType).toBe("test_relation");
    });

    it("自己ループするエッジ作成はvalidationエラーになる", async () => {
      const { ok: node } = await knowledgeRepository.createNode({
        name: "自己ループ",
      });

      const result = await knowledgeRepository.createEdge({
        fromId: node!.id,
        toId: node!.id,
        edgeType: "self_loop",
      });

      expect(result.err?.type).toBe("validation");
    });

    it("同一(fromId, toId, edgeType)のエッジ重複はunique_constraintエラーになる", async () => {
      const { ok: node1 } = await knowledgeRepository.createNode({
        name: "ノードA",
      });
      const { ok: node2 } = await knowledgeRepository.createNode({
        name: "ノードB",
      });

      await knowledgeRepository.createEdge({
        fromId: node1!.id,
        toId: node2!.id,
        edgeType: "duplicate_test",
      });

      const result = await knowledgeRepository.createEdge({
        fromId: node1!.id,
        toId: node2!.id,
        edgeType: "duplicate_test",
      });

      expect(result.err?.type).toBe("unique_constraint");
    });
  });

  describe("Episode deletion cascade", () => {
    it("Episodeが削除されると対応するKnowledgeNodeも削除される", async () => {
      const { ok: work } = await workRepository.create({
        title: "エピソード削除連動テスト",
        publishedAt: new Date("2024-01-01T04:00:00+09:00"),
      });

      await episodeRepository.createMany([
        {
          workId: work!.id,
          count: 1,
          publishedAt: new Date("2024-01-08T04:00:00+09:00"),
        },
      ]);

      const episodes = await db.episode.findMany({
        where: { workId: work!.id },
      });
      const knId = episodes[0].knowledgeNodeId;

      // エピソード削除を実行
      await episodeRepository.deleteAndReorder(work!.id, 1);

      // 対応する KnowledgeNode も消えていることを確認
      const knNode = await db.knowledgeNode.findUnique({
        where: { id: knId },
      });
      expect(knNode).toBeNull();
    });
  });
});
