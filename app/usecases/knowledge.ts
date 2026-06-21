import type { KnowledgeRepository } from "~/domain/knowledge/repository";
import type {
  KnowledgeNodeDetail,
  KnowledgeNodeSummary,
} from "~/domain/knowledge/types";
import type { AppError, Result } from "~/utils/result";

export const getKnowledgeList =
  (repos: { knowledgeRepo: KnowledgeRepository }) =>
  async (): Promise<KnowledgeNodeSummary[]> => {
    return repos.knowledgeRepo.findMany();
  };

export const getKnowledgeDetail =
  (repos: { knowledgeRepo: KnowledgeRepository }) =>
  async (id: number): Promise<KnowledgeNodeDetail | null> => {
    return repos.knowledgeRepo.findById(id);
  };

export const createKnowledgeNode =
  (repos: { knowledgeRepo: KnowledgeRepository }) =>
  async (input: {
    name: string;
    content?: string | null;
  }): Promise<Result<{ id: number }, AppError>> => {
    return repos.knowledgeRepo.createNode(input);
  };

export const updateKnowledgeNode =
  (repos: { knowledgeRepo: KnowledgeRepository }) =>
  async (
    id: number,
    input: { name?: string; content?: string | null },
  ): Promise<Result<void, AppError>> => {
    return repos.knowledgeRepo.updateNode(id, input);
  };

export const deleteKnowledgeNode =
  (repos: { knowledgeRepo: KnowledgeRepository }) =>
  async (id: number): Promise<Result<void, AppError>> => {
    return repos.knowledgeRepo.deleteNode(id);
  };

export const createKnowledgeEdge =
  (repos: { knowledgeRepo: KnowledgeRepository }) =>
  async (input: {
    fromId: number;
    toId: number;
    edgeType: string;
  }): Promise<Result<void, AppError>> => {
    return repos.knowledgeRepo.createEdge(input);
  };

export const deleteKnowledgeEdge =
  (repos: { knowledgeRepo: KnowledgeRepository }) =>
  async (id: number): Promise<Result<void, AppError>> => {
    return repos.knowledgeRepo.deleteEdge(id);
  };
