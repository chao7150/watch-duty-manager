import { knowledgeRepository } from "~/adapters/repository/prisma/knowledge";
import type { Route } from "./+types/api.knowledge-search-nodes";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const excludeId = Number(url.searchParams.get("excludeId") ?? "0");
  if (Number.isNaN(excludeId) || q.trim() === "") {
    return { nodes: [] };
  }
  const nodes = await knowledgeRepository.searchNodes({
    query: q,
    excludeId,
    limit: 20,
  });
  return { nodes };
};
