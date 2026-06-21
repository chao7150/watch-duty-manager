import type { AppError, Result } from "~/utils/result";
import type {
  KnowledgeEdge,
  KnowledgeNodeDetail,
  KnowledgeNodeKind,
  KnowledgeNodeListItem,
  KnowledgeNodeSummary,
} from "./types";

export interface KnowledgeRepository {
  findMany(): Promise<KnowledgeNodeSummary[]>;
  findManyPaginated(params: {
    query?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: KnowledgeNodeListItem[]; totalCount: number }>;
  findManyWithEdges(): Promise<{
    nodes: KnowledgeNodeSummary[];
    edges: KnowledgeEdge[];
  }>;
  findAllEdgeTypes(): Promise<string[]>;
  searchNodes(params: {
    query: string;
    excludeId: number;
    limit: number;
  }): Promise<{ id: number; kind: KnowledgeNodeKind; label: string }[]>;
  findById(id: number): Promise<KnowledgeNodeDetail | null>;
  createNode(data: {
    name: string;
    content?: string | null;
  }): Promise<Result<{ id: number }, AppError>>;
  updateNode(
    id: number,
    data: { name?: string; content?: string | null },
  ): Promise<Result<void, AppError>>;
  deleteNode(id: number): Promise<Result<void, AppError>>;
  createEdge(data: {
    fromId: number;
    toId: number;
    edgeType: string;
  }): Promise<Result<void, AppError>>;
  deleteEdge(id: number): Promise<Result<void, AppError>>;
}
