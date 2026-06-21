import { useEffect, useRef, useState } from "react";
import { Form, Link, redirect, useFetcher } from "react-router";
import urlFrom from "url-from";
import { knowledgeRepository } from "~/adapters/repository/prisma/knowledge";
import {
  createKnowledgeEdge,
  deleteKnowledgeEdge,
  deleteKnowledgeNode,
  updateKnowledgeNode,
} from "~/usecases/knowledge";
import type { Route } from "./+types/knowledge.$nodeId";
import type { loader as searchNodesLoader } from "./api.knowledge-search-nodes";

export const bindUrl = urlFrom`/knowledge/${"nodeId:number"}`;

export const loader = async ({ params }: Route.LoaderArgs) => {
  const nodeId = Number(params.nodeId);
  if (Number.isNaN(nodeId)) {
    throw new Response("Bad Request", { status: 400 });
  }

  const [node, allEdgeTypes] = await Promise.all([
    knowledgeRepository.findById(nodeId),
    knowledgeRepository.findAllEdgeTypes(),
  ]);

  if (!node) {
    throw new Response("Not Found", { status: 404 });
  }

  return { node, allEdgeTypes };
};

export const action = async ({ request, params }: Route.ActionArgs) => {
  const nodeId = Number(params.nodeId);
  if (Number.isNaN(nodeId)) {
    throw new Response("Bad Request", { status: 400 });
  }
  const formData = await request.formData();
  const _action = formData.get("_action")?.toString();

  if (_action === "update_node") {
    const name = formData.get("name")?.toString() || "";
    const content = formData.get("content")?.toString() || "";
    const result = await updateKnowledgeNode({
      knowledgeRepo: knowledgeRepository,
    })(nodeId, {
      name,
      content: content || null,
    });

    if (result.err) {
      return {
        error:
          result.err.type === "validation"
            ? result.err.message
            : "更新に失敗しました",
        success: null,
      };
    }
    return { error: null, success: "更新しました" };
  }

  if (_action === "delete_node") {
    const result = await deleteKnowledgeNode({
      knowledgeRepo: knowledgeRepository,
    })(nodeId);

    if (result.err) {
      return {
        error:
          result.err.type === "validation"
            ? result.err.message
            : "削除に失敗しました",
      };
    }
    return redirect("/knowledge");
  }

  if (_action === "create_edges") {
    const toIds = formData
      .getAll("toId")
      .map((v) => Number(v))
      .filter((id) => !Number.isNaN(id));
    if (toIds.length === 0) {
      return { error: "対象ノードを選択してください" };
    }
    const edgeType = formData.get("edgeType")?.toString() || "";

    const errors: string[] = [];
    for (const toId of toIds) {
      const result = await createKnowledgeEdge({
        knowledgeRepo: knowledgeRepository,
      })({
        fromId: nodeId,
        toId,
        edgeType,
      });
      if (result.err) {
        if (result.err.type === "unique_constraint") {
          continue;
        }
        errors.push(
          result.err.type === "validation"
            ? result.err.message
            : "エッジの作成に失敗しました",
        );
      }
    }
    if (errors.length > 0) {
      return { error: errors.join(" / ") };
    }
    return { error: null };
  }

  if (_action === "delete_edge") {
    const edgeId = Number(formData.get("edgeId"));
    if (Number.isNaN(edgeId)) {
      return { error: "不正なエッジIDです" };
    }
    const result = await deleteKnowledgeEdge({
      knowledgeRepo: knowledgeRepository,
    })(edgeId);

    if (result.err) {
      return { error: "エッジの削除に失敗しました" };
    }
    return { error: null };
  }

  return null;
};

function EdgeDeleteMenu({ edgeId }: { edgeId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="text-text-weak hover:text-text px-1"
        onClick={() => setOpen(!open)}
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-accent-area border border-outline rounded-md shadow-lg">
          <Form method="post">
            <input type="hidden" name="edgeId" value={edgeId} />
            <button
              type="submit"
              name="_action"
              value="delete_edge"
              className="block w-full text-left text-xs text-red px-3 py-2 hover:bg-dark whitespace-nowrap"
            >
              削除
            </button>
          </Form>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeDetail({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { node, allEdgeTypes } = loaderData;
  const error = actionData?.error;
  const success = actionData?.success;
  const [suggestQuery, setSuggestQuery] = useState("");
  const [selectedToIds, setSelectedToIds] = useState<Set<number>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [edgeTypeQuery, setEdgeTypeQuery] = useState("");
  const searchFetcher = useFetcher<typeof searchNodesLoader>();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const availableSuggestions = (searchFetcher.data?.nodes ?? []).filter(
    (n) => !existingTargets.has(n.id),
  );

  const currentNodeEdgeTypes = [
    ...new Set(node.outgoing.map((e) => e.edgeType)),
  ];

  const edgeTypeSuggestions =
    edgeTypeQuery.trim() === ""
      ? []
      : allEdgeTypes.filter(
          (t) =>
            !currentNodeEdgeTypes.includes(t) &&
            t.toLowerCase().includes(edgeTypeQuery.toLowerCase()),
        );

  const existingTargets = new Set(
    node.outgoing
      .filter((e) => e.edgeType === edgeTypeQuery)
      .map((e) => e.node.id),
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (suggestQuery.trim() === "") return;
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams({
        q: suggestQuery,
        excludeId: String(node.id),
      });
      searchFetcher.load(`/api/knowledge-search-nodes?${params.toString()}`);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [suggestQuery, node.id, searchFetcher.load]);

  const groupByEdgeType = (edges: typeof node.outgoing) => {
    const groups = new Map<string, typeof node.outgoing>();
    for (const e of edges) {
      const list = groups.get(e.edgeType) ?? [];
      list.push(e);
      groups.set(e.edgeType, list);
    }
    return groups;
  };

  const outgoingGroups = groupByEdgeType(node.outgoing);
  const incomingGroups = groupByEdgeType(node.incoming);

  const toggleNode = (id: number) => {
    setSelectedToIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <Link to="/knowledge" className="text-sm">
          ← 一覧に戻る
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-md bg-red bg-opacity-10 border border-red border-opacity-20 text-sm text-white">
          {error}
        </div>
      )}

      {success && <div className="mb-6 p-4 rounded-md text-sm">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-accent-area p-6 rounded-lg border border-outline space-y-4">
            <div className="flex items-center justify-between border-b border-outline pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-weak bg-dark px-2 py-1 rounded">
                  {node.kind}
                </span>
                <h1 className="text-2xl font-bold mt-2 text-text-strong">
                  {node.label}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {node.kind !== "knowledge" && (
                  <Link
                    to={node.url}
                    className="text-xs bg-dark hover:opacity-80 text-link px-3 py-1.5 rounded-md border border-outline"
                  >
                    元のページを見る
                  </Link>
                )}
                {node.kind === "knowledge" && !isEditing && (
                  <button
                    type="button"
                    className="text-xs bg-dark hover:opacity-80 text-text px-3 py-1.5 rounded-md border border-outline"
                    onClick={() => setIsEditing(true)}
                  >
                    編集
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <Form method="post" className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-text-weak mb-1"
                  >
                    名前
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={node.label}
                    required
                    className="w-full px-3 py-2 border border-outline rounded-md focus:outline-none focus:ring-1 focus:ring-link focus:border-link"
                  />
                </div>
                <div>
                  <label
                    htmlFor="content"
                    className="block text-sm font-medium text-text-weak mb-1"
                  >
                    説明・本文
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    rows={4}
                    defaultValue={node.content || ""}
                    className="w-full px-3 py-2 border border-outline rounded-md focus:outline-none focus:ring-1 focus:ring-link focus:border-link"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    name="_action"
                    value="update_node"
                    className="flex-1 py-2 px-4 border border-transparent rounded-md text-sm font-medium bg-link text-dark hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-link focus:ring-offset-2 focus:ring-offset-dark"
                  >
                    保存する
                  </button>
                  <button
                    type="button"
                    className="py-2 px-4 rounded-md text-sm font-medium text-text-weak border border-outline hover:opacity-80"
                    onClick={() => setIsEditing(false)}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    name="_action"
                    value="delete_node"
                    className="py-2 px-4 rounded-md text-sm font-medium text-red border border-red border-opacity-40 bg-accent-area hover:opacity-80 focus:outline-none"
                    onClick={(e) => {
                      if (
                        !confirm(
                          "本当にこのノードを削除しますか？接続するエッジもすべて削除されます。",
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    削除
                  </button>
                </div>
              </Form>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-text-weak mb-1">
                  説明・本文
                </h3>
                <div className="bg-dark p-4 rounded-md border border-outline text-text text-sm whitespace-pre-wrap">
                  {node.content || (
                    <span className="text-text-weak italic">
                      説明はありません
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-accent-area p-6 rounded-lg border border-outline space-y-6">
            <h2 className="font-bold text-text-strong border-b border-outline pb-3">
              関連情報 (エッジ)
            </h2>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-weak uppercase tracking-wider">
                このノードからの関連 (Outgoing)
              </h3>
              {node.outgoing.length === 0 ? (
                <p className="text-xs text-text-weak italic">
                  関連はありません
                </p>
              ) : (
                <div className="space-y-3">
                  {[...outgoingGroups.entries()].map(
                    ([edgeType, neighbors]) => (
                      <div
                        key={edgeType}
                        className="border border-outline rounded-md"
                      >
                        <div className="px-3 py-2 text-xs font-semibold text-text-weak bg-dark rounded-t-md">
                          ──({edgeType})──&gt;
                        </div>
                        <ul className="divide-y divide-outline">
                          {neighbors.map((neighbor) => (
                            <li
                              key={neighbor.edgeId}
                              className="px-3 py-2 flex items-center justify-between hover:bg-dark text-sm"
                            >
                              <div className="flex items-center space-x-2">
                                <Link
                                  to={neighbor.node.url}
                                  className="font-medium text-text-strong hover:underline"
                                >
                                  {neighbor.node.label}
                                </Link>
                              </div>
                              <EdgeDeleteMenu edgeId={neighbor.edgeId} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-weak uppercase tracking-wider">
                このノードへの関連 (Incoming)
              </h3>
              {node.incoming.length === 0 ? (
                <p className="text-xs text-text-weak italic">
                  関連はありません
                </p>
              ) : (
                <div className="space-y-3">
                  {[...incomingGroups.entries()].map(
                    ([edgeType, neighbors]) => (
                      <div
                        key={edgeType}
                        className="border border-outline rounded-md"
                      >
                        <div className="px-3 py-2 text-xs font-semibold text-text-weak bg-dark rounded-t-md">
                          ──({edgeType})──&gt;
                        </div>
                        <ul className="divide-y divide-outline">
                          {neighbors.map((neighbor) => (
                            <li
                              key={neighbor.edgeId}
                              className="px-3 py-2 flex items-center justify-between hover:bg-dark text-sm"
                            >
                              <div className="flex items-center space-x-2">
                                <Link
                                  to={neighbor.node.url}
                                  className="font-medium text-text-strong hover:underline"
                                >
                                  {neighbor.node.label}
                                </Link>
                              </div>
                              <EdgeDeleteMenu edgeId={neighbor.edgeId} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-accent-area p-6 rounded-lg border border-outline space-y-4">
            <h2 className="font-bold text-text-strong border-b border-outline pb-2">
              新しく関連付ける (エッジ)
            </h2>
            <Form method="post" className="space-y-4">
              <div>
                <span className="block text-sm font-medium text-text-weak mb-1">
                  元ノード
                </span>
                <div className="text-sm font-semibold text-text-strong bg-dark px-3 py-2 border border-outline rounded-md">
                  {node.label}
                </div>
              </div>

              <div>
                <label
                  htmlFor="edgeType"
                  className="block text-sm font-medium text-text-weak mb-1"
                >
                  関係の種類 (edgeType)
                </label>
                {currentNodeEdgeTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {currentNodeEdgeTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="text-xs bg-dark text-text-strong px-2 py-1 rounded-md border border-outline hover:opacity-80"
                        onClick={() => setEdgeTypeQuery(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    id="edgeType"
                    name="edgeType"
                    required
                    placeholder="例: produced_by / adaptation_of / is_a"
                    value={edgeTypeQuery}
                    onChange={(e) => setEdgeTypeQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-outline rounded-md focus:outline-none focus:ring-1 focus:ring-link"
                  />
                  {edgeTypeSuggestions.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 max-h-32 overflow-y-auto bg-accent-area border border-outline rounded-md shadow-lg">
                      {edgeTypeSuggestions.map((t) => (
                        <li key={t}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-dark text-text-strong"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setEdgeTypeQuery(t)}
                          >
                            {t}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-text-weak mb-1">
                  対象ノード
                </span>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="ノード名で検索..."
                  value={suggestQuery}
                  onChange={(e) => setSuggestQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-outline rounded-md focus:outline-none focus:ring-1 focus:ring-link"
                />
                {Array.from(selectedToIds).map((id) => (
                  <input key={id} type="hidden" name="toId" value={id} />
                ))}
                {suggestQuery.trim() !== "" && (
                  <div className="mt-2 h-48 overflow-y-auto border border-outline rounded-md">
                    {searchFetcher.state === "loading" ? (
                      <p className="px-3 py-2 text-xs text-text-weak">
                        検索中...
                      </p>
                    ) : availableSuggestions.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-text-weak">
                        該当するノードがありません
                      </p>
                    ) : (
                      availableSuggestions.map((n) => (
                        <label
                          key={n.id}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-dark cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedToIds.has(n.id)}
                            onChange={() => toggleNode(n.id)}
                            className="accent-link"
                          />
                          <span className="text-text-strong">{n.label}</span>
                          <span className="text-xs text-text-weak">
                            ({n.kind})
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                name="_action"
                value="create_edges"
                disabled={selectedToIds.size === 0}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium bg-link text-dark hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-link focus:ring-offset-2 focus:ring-offset-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                関連を追加する
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
