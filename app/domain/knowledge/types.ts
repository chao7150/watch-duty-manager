export type KnowledgeNodeKind = "work" | "episode" | "knowledge";

export type KnowledgeNodeSummary = {
  id: number;
  kind: KnowledgeNodeKind;
  label: string;
  url: string;
};

export type KnowledgeNeighbor = {
  edgeId: number;
  edgeType: string;
  direction: "outgoing" | "incoming";
  node: KnowledgeNodeSummary;
};

export type KnowledgeNodeDetail = KnowledgeNodeSummary & {
  content: string | null;
  outgoing: KnowledgeNeighbor[];
  incoming: KnowledgeNeighbor[];
};

export type KnowledgeEdge = {
  fromId: number;
  toId: number;
  edgeType: string;
};

export type KnowledgeNodeListItem = KnowledgeNodeSummary & {
  edgeCount: number;
};
