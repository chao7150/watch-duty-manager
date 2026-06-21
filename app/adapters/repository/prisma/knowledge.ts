import type { KnowledgeRepository } from "~/domain/knowledge/repository";
import type {
  KnowledgeNeighbor,
  KnowledgeNodeKind,
} from "~/domain/knowledge/types";
import { db } from "~/utils/db.server";
import { Err, Ok } from "~/utils/result";
import { isPrismaError, prismaErrorAssorter } from "./prisma-error";

function getKnowledgeNodeKind(node: {
  work?: unknown | null;
  episode?: unknown | null;
}): KnowledgeNodeKind {
  if (node.work) return "work";
  if (node.episode) return "episode";
  return "knowledge";
}

// biome-ignore lint/suspicious/noExplicitAny: prisma dynamic include
function getLabelAndUrl(node: any): { label: string; url: string } {
  if (node.work) {
    return {
      label: node.work.title,
      url: `/works/${node.work.id}`,
    };
  }
  if (node.episode) {
    const epTitle = node.episode.title;
    const workTitle = node.episode.work.title;
    const label = epTitle ? epTitle : `${workTitle} #${node.episode.count}`;
    return {
      label,
      url: `/works/${node.episode.work.id}/${node.episode.count}`,
    };
  }
  return {
    label: node.name || `Node ${node.id}`,
    url: `/knowledge/${node.id}`,
  };
}

export const knowledgeRepository: KnowledgeRepository = {
  findMany: async () => {
    const nodes = await db.knowledgeNode.findMany({
      include: {
        work: true,
        episode: {
          include: {
            work: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    return nodes.map((n) => {
      const kind = getKnowledgeNodeKind(n);
      const { label, url } = getLabelAndUrl(n);
      return {
        id: n.id,
        kind,
        label,
        url,
      };
    });
  },

  findManyPaginated: async ({ query, page, pageSize }) => {
    const baseFilter = {
      work: null,
      episode: null,
    };
    const where = query
      ? { ...baseFilter, name: { contains: query } }
      : baseFilter;
    const [nodes, totalCount] = await Promise.all([
      db.knowledgeNode.findMany({
        where,
        include: {
          work: true,
          episode: {
            include: {
              work: true,
            },
          },
          _count: {
            select: { outgoingEdges: true, incomingEdges: true },
          },
        },
        orderBy: { id: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.knowledgeNode.count({ where }),
    ]);

    return {
      items: nodes.map((n) => {
        const kind = getKnowledgeNodeKind(n);
        const { label, url } = getLabelAndUrl(n);
        return {
          id: n.id,
          kind,
          label,
          url,
          edgeCount: n._count.outgoingEdges + n._count.incomingEdges,
        };
      }),
      totalCount,
    };
  },

  findManyWithEdges: async () => {
    const edges = await db.knowledgeEdge.findMany({
      select: { fromId: true, toId: true, edgeType: true },
    });

    const connectedNodeIds = new Set<number>();
    for (const e of edges) {
      connectedNodeIds.add(e.fromId);
      connectedNodeIds.add(e.toId);
    }

    const nodes =
      connectedNodeIds.size === 0
        ? []
        : await db.knowledgeNode.findMany({
            where: { id: { in: [...connectedNodeIds] } },
            include: {
              work: true,
              episode: {
                include: {
                  work: true,
                },
              },
            },
            orderBy: { id: "asc" },
          });

    return {
      nodes: nodes.map((n) => {
        const kind = getKnowledgeNodeKind(n);
        const { label, url } = getLabelAndUrl(n);
        return { id: n.id, label, kind, url };
      }),
      edges: edges.map((e) => ({
        fromId: e.fromId,
        toId: e.toId,
        edgeType: e.edgeType,
      })),
    };
  },

  findAllEdgeTypes: async () => {
    const result = await db.knowledgeEdge.findMany({
      select: { edgeType: true },
      distinct: ["edgeType"],
      orderBy: { edgeType: "asc" },
    });
    return result.map((r) => r.edgeType);
  },

  searchNodes: async ({ query, excludeId, limit }) => {
    const conditions: object[] = [
      { name: { contains: query } },
      { work: { title: { contains: query } } },
      { episode: { title: { contains: query } } },
      { episode: { work: { title: { contains: query } } } },
    ];
    const numericQuery = Number.parseInt(query, 10);
    if (!Number.isNaN(numericQuery)) {
      conditions.push({ episode: { count: numericQuery } });
    }
    const nodes = await db.knowledgeNode.findMany({
      where: {
        id: { not: excludeId },
        OR: conditions,
      },
      include: {
        work: true,
        episode: {
          include: {
            work: true,
          },
        },
      },
      orderBy: { id: "asc" },
      take: limit,
    });
    return nodes.map((n) => {
      const kind = getKnowledgeNodeKind(n);
      const { label } = getLabelAndUrl(n);
      return { id: n.id, kind, label };
    });
  },

  findById: async (id) => {
    const node = await db.knowledgeNode.findUnique({
      where: { id },
      include: {
        work: true,
        episode: {
          include: {
            work: true,
          },
        },
        outgoingEdges: {
          include: {
            to: {
              include: {
                work: true,
                episode: {
                  include: {
                    work: true,
                  },
                },
              },
            },
          },
        },
        incomingEdges: {
          include: {
            from: {
              include: {
                work: true,
                episode: {
                  include: {
                    work: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!node) {
      return null;
    }

    const kind = getKnowledgeNodeKind(node);
    const { label, url } = getLabelAndUrl(node);

    const outgoing: KnowledgeNeighbor[] = node.outgoingEdges.map((edge) => {
      const neighborNode = edge.to;
      const neighborKind = getKnowledgeNodeKind(neighborNode);
      const neighborLabelUrl = getLabelAndUrl(neighborNode);
      return {
        edgeId: edge.id,
        edgeType: edge.edgeType,
        direction: "outgoing",
        node: {
          id: neighborNode.id,
          kind: neighborKind,
          label: neighborLabelUrl.label,
          url: neighborLabelUrl.url,
        },
      };
    });

    const incoming: KnowledgeNeighbor[] = node.incomingEdges.map((edge) => {
      const neighborNode = edge.from;
      const neighborKind = getKnowledgeNodeKind(neighborNode);
      const neighborLabelUrl = getLabelAndUrl(neighborNode);
      return {
        edgeId: edge.id,
        edgeType: edge.edgeType,
        direction: "incoming",
        node: {
          id: neighborNode.id,
          kind: neighborKind,
          label: neighborLabelUrl.label,
          url: neighborLabelUrl.url,
        },
      };
    });

    return {
      id: node.id,
      kind,
      label,
      url,
      content: node.content,
      outgoing,
      incoming,
    };
  },

  createNode: async (data) => {
    const trimmedName = data.name.trim();
    if (trimmedName.length === 0) {
      return Err({
        type: "validation",
        message: "名前を入力してください",
      });
    }

    try {
      const node = await db.knowledgeNode.create({
        data: {
          name: trimmedName,
          content: data.content,
        },
      });
      return Ok({ id: node.id });
    } catch (e) {
      return Err({
        type: "db",
        message: "createNode failed",
        cause: e,
      });
    }
  },

  updateNode: async (id, data) => {
    try {
      const node = await db.knowledgeNode.findUnique({
        where: { id },
        include: { work: true, episode: true },
      });

      if (!node) {
        return Err({
          type: "not_found",
          resource: "KnowledgeNode",
          id,
        });
      }

      const isDerived = !!(node.work || node.episode);

      const updateData: { name?: string; content?: string | null } = {};

      if (data.name !== undefined) {
        const trimmedName = data.name.trim();
        if (trimmedName.length === 0) {
          return Err({
            type: "validation",
            message: "名前を入力してください",
          });
        }
        if (isDerived) {
          return Err({
            type: "validation",
            message:
              "作品またはエピソード由来の知識ノードの名前は編集できません",
          });
        }
        updateData.name = trimmedName;
      }

      if (data.content !== undefined) {
        updateData.content = data.content;
      }

      await db.knowledgeNode.update({
        where: { id },
        data: updateData,
      });
      return Ok(undefined);
    } catch (e) {
      return Err({
        type: "db",
        message: "updateNode failed",
        cause: e,
      });
    }
  },

  deleteNode: async (id) => {
    try {
      const node = await db.knowledgeNode.findUnique({
        where: { id },
        include: { work: true, episode: true },
      });

      if (!node) {
        return Err({
          type: "not_found",
          resource: "KnowledgeNode",
          id,
        });
      }

      if (node.work || node.episode) {
        return Err({
          type: "validation",
          message: "作品またはエピソード由来の知識ノードは削除できません",
        });
      }

      await db.knowledgeNode.delete({
        where: { id },
      });
      return Ok(undefined);
    } catch (e) {
      return Err({
        type: "db",
        message: "deleteNode failed",
        cause: e,
      });
    }
  },

  createEdge: async (data) => {
    const { fromId, toId, edgeType } = data;
    if (fromId === toId) {
      return Err({
        type: "validation",
        message: "自己ループするエッジは作成できません",
      });
    }

    try {
      await db.knowledgeEdge.create({
        data: {
          fromId,
          toId,
          edgeType,
        },
      });
      return Ok(undefined);
    } catch (e) {
      if (isPrismaError(e)) {
        switch (prismaErrorAssorter(e)) {
          case "P2002":
            return Err({
              type: "unique_constraint",
              duplicatedFields: ["fromId", "toId", "edgeType"],
            });
          case "P2003":
            return Err({
              type: "validation",
              message: "指定されたノードが存在しません",
            });
          default:
            return Err({
              type: "db",
              message: "createEdge failed",
              cause: e,
            });
        }
      }
      return Err({
        type: "db",
        message: "createEdge failed",
        cause: e,
      });
    }
  },

  deleteEdge: async (id) => {
    try {
      const edge = await db.knowledgeEdge.findUnique({
        where: { id },
      });

      if (!edge) {
        return Err({
          type: "not_found",
          resource: "KnowledgeEdge",
          id,
        });
      }

      await db.knowledgeEdge.delete({
        where: { id },
      });
      return Ok(undefined);
    } catch (e) {
      return Err({
        type: "db",
        message: "deleteEdge failed",
        cause: e,
      });
    }
  },
};
