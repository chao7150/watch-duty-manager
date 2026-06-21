import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Form, Link, redirect, useNavigate } from "react-router";
import urlFrom from "url-from";
import { knowledgeRepository } from "~/adapters/repository/prisma/knowledge";
import type { KnowledgeNodeKind } from "~/domain/knowledge/types";
import { createKnowledgeNode } from "~/usecases/knowledge";
import type { Route } from "./+types/knowledge._index";

const ForceGraph2D = lazy(() => import("react-force-graph-2d"));

export const bindUrl = urlFrom`/knowledge`;

export const loader = async () => {
  const { nodes, edges } = await knowledgeRepository.findManyWithEdges();
  return { nodes, edges };
};

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();
  const name = formData.get("name")?.toString() || "";
  const content = formData.get("content")?.toString() || "";

  const result = await createKnowledgeNode({
    knowledgeRepo: knowledgeRepository,
  })({
    name,
    content: content || null,
  });

  if (result.err) {
    return {
      error:
        result.err.type === "validation"
          ? result.err.message
          : "作成に失敗しました",
    };
  }

  return redirect(`/knowledge/${result.ok.id}`);
};

const NODE_COLORS: Record<string, string> = {
  work: "#8ab4f8",
  episode: "#f28b82",
  knowledge: "#bdc1c6",
};

type GraphViewNode = {
  id: number;
  label: string;
  kind: KnowledgeNodeKind;
  url: string;
  color: string;
};

type GraphViewLink = {
  source: number;
  target: number;
  edgeType: string;
};

export default function KnowledgeIndex({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { nodes, edges } = loaderData;
  const error = actionData?.error;
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [mounted]);

  const graphData: { nodes: GraphViewNode[]; links: GraphViewLink[] } = {
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      url: n.url,
      color: NODE_COLORS[n.kind] ?? "#bdc1c6",
    })),
    links: edges.map((e) => ({
      source: e.fromId,
      target: e.toId,
      edgeType: e.edgeType,
    })),
  };

  const handleNodeClick = useCallback(
    (node: object) => {
      const url = (node as GraphViewNode).url;
      if (url) navigate(url);
    },
    [navigate],
  );

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="font-bold">アニメ知識グラフ</h1>
          <Link to="/knowledge/list" className="text-sm">
            ノード一覧 →
          </Link>
        </div>
        <p className="text-text-weak text-sm mt-1">
          ノードをクリックして詳細ページに移動できます。
        </p>
        <div className="flex gap-4 mt-2 text-xs text-text-weak">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: NODE_COLORS.work }}
            />
            作品
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: NODE_COLORS.episode }}
            />
            エピソード
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: NODE_COLORS.knowledge }}
            />
            知識
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="bg-accent-area rounded-lg border border-outline mb-8"
        style={{ height: 500 }}
      >
        {mounted && (
          <Suspense
            fallback={<div className="p-4 text-text-weak">読み込み中...</div>}
          >
            <ForceGraph2D
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              nodeLabel="label"
              nodeColor="color"
              nodeVal={1}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.1}
              onNodeClick={handleNodeClick}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const n = node as (typeof graphData.nodes)[number] & {
                  x: number;
                  y: number;
                };
                const fontSize = Math.max(12 / globalScale, 2);
                ctx.font = `${fontSize}px Sans-Serif`;
                const textWidth = ctx.measureText(n.label).width;
                const bgWidth = textWidth + fontSize;
                const bgHeight = fontSize * 1.5;

                ctx.fillStyle = "rgba(32, 33, 36, 0.85)";
                ctx.beginPath();
                const radius = fontSize * 0.3;
                const bx = n.x - bgWidth / 2;
                const by = n.y - bgHeight / 2 - fontSize;
                ctx.roundRect(bx, by, bgWidth, bgHeight, radius);
                ctx.fill();

                ctx.fillStyle = n.color;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(n.label, n.x, n.y - fontSize * 0.5);

                const nodeRadius = 4 / globalScale;
                ctx.beginPath();
                ctx.arc(n.x, n.y + fontSize * 0.6, nodeRadius, 0, 2 * Math.PI);
                ctx.fillStyle = n.color;
                ctx.fill();

                node.__hitArea = { w: bgWidth, h: bgHeight + fontSize };
              }}
              nodePointerAreaPaint={(node, color, ctx) => {
                const n = node as (typeof graphData.nodes)[number] & {
                  x: number;
                  y: number;
                  __hitArea?: { w: number; h: number };
                };
                const hitArea = n.__hitArea;
                if (!hitArea) return;
                ctx.fillStyle = color;
                ctx.fillRect(
                  n.x - hitArea.w / 2,
                  n.y - hitArea.h,
                  hitArea.w,
                  hitArea.h,
                );
              }}
            />
          </Suspense>
        )}
      </div>

      <div className="bg-accent-area p-6 rounded-lg border border-outline">
        <h2 className="font-semibold mb-4">新規知識ノードの作成</h2>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red bg-opacity-10 border border-red border-opacity-20 text-sm text-white">
            {error}
          </div>
        )}
        <Form method="post" className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-text-weak mb-1"
            >
              名前 <span className="text-red">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full px-3 py-2 border border-outline rounded-md focus:outline-none focus:ring-1 focus:ring-link focus:border-link"
              placeholder="例: アニプレックス"
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
              className="w-full px-3 py-2 border border-outline rounded-md focus:outline-none focus:ring-1 focus:ring-link focus:border-link"
              placeholder="詳細な説明を入力してください"
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium bg-link text-dark hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-link focus:ring-offset-2 focus:ring-offset-dark"
          >
            作成する
          </button>
        </Form>
      </div>
    </div>
  );
}
