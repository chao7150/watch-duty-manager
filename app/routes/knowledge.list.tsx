import { Link } from "react-router";
import urlFrom from "url-from";
import { knowledgeRepository } from "~/adapters/repository/prisma/knowledge";
import { bindUrl as bindUrlForKnowledgeDetail } from "~/routes/knowledge.$nodeId";
import type { Route } from "./+types/knowledge.list";

export const bindUrl = urlFrom`/knowledge/list`;

const PAGE_SIZE = 50;

function buildListUrl(q?: string, page?: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${bindUrl()}?${qs}` : bindUrl();
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));

  const { items, totalCount } = await knowledgeRepository.findManyPaginated({
    query: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return { items, totalCount, q, page, totalPages };
};

export default function KnowledgeList({ loaderData }: Route.ComponentProps) {
  const { items, totalCount, q, page, totalPages } = loaderData;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold">ノード一覧</h1>
        <Link to="/knowledge" className="text-sm">
          ← グラフに戻る
        </Link>
      </div>

      <form method="get" className="mb-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="ノード名で検索..."
          className="w-full px-3 py-2 border border-outline rounded-md focus:outline-none focus:ring-1 focus:ring-link focus:border-link"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-link text-dark rounded-md text-sm font-medium hover:bg-opacity-90"
        >
          検索
        </button>
      </form>

      <p className="text-sm text-text-weak mb-3">
        {totalCount}件{q ? `（「${q}」で絞り込み）` : ""}
      </p>

      {items.length === 0 ? (
        <p className="text-text-weak">該当するノードはありません。</p>
      ) : (
        <ul className="divide-y divide-outline border border-outline rounded-lg overflow-hidden">
          {items.map((node) => (
            <li
              key={node.id}
              className="p-3 hover:bg-dark flex items-center justify-between"
            >
              <div>
                <Link
                  to={bindUrlForKnowledgeDetail({ nodeId: node.id })}
                  className="font-medium"
                >
                  {node.label}
                </Link>
                <div className="text-xs text-text-weak mt-0.5">
                  エッジ {node.edgeCount}
                </div>
              </div>
              <Link
                to={bindUrlForKnowledgeDetail({ nodeId: node.id })}
                className="text-xs bg-dark hover:opacity-80 text-text px-3 py-1.5 rounded-md border border-outline"
              >
                詳細
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Link
            to={buildListUrl(q, 1)}
            className={`px-3 py-1 rounded-md text-sm ${page === 1 ? "text-text-weak cursor-default" : "bg-dark text-text hover:opacity-80 border border-outline"}`}
            aria-disabled={page === 1}
            onClick={page === 1 ? (e) => e.preventDefault() : undefined}
          >
            最初
          </Link>
          <Link
            to={buildListUrl(q, Math.max(1, page - 1))}
            className={`px-3 py-1 rounded-md text-sm ${page === 1 ? "text-text-weak cursor-default" : "bg-dark text-text hover:opacity-80 border border-outline"}`}
            aria-disabled={page === 1}
            onClick={page === 1 ? (e) => e.preventDefault() : undefined}
          >
            前へ
          </Link>
          <span className="px-3 py-1 text-sm text-text-weak">
            {page} / {totalPages}
          </span>
          <Link
            to={buildListUrl(q, Math.min(totalPages, page + 1))}
            className={`px-3 py-1 rounded-md text-sm ${page === totalPages ? "text-text-weak cursor-default" : "bg-dark text-text hover:opacity-80 border border-outline"}`}
            aria-disabled={page === totalPages}
            onClick={
              page === totalPages ? (e) => e.preventDefault() : undefined
            }
          >
            次へ
          </Link>
          <Link
            to={buildListUrl(q, totalPages)}
            className={`px-3 py-1 rounded-md text-sm ${page === totalPages ? "text-text-weak cursor-default" : "bg-dark text-text hover:opacity-80 border border-outline"}`}
            aria-disabled={page === totalPages}
            onClick={
              page === totalPages ? (e) => e.preventDefault() : undefined
            }
          >
            最後
          </Link>
        </div>
      )}
    </div>
  );
}
