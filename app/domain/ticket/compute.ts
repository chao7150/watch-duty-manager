import type { Temporal } from "temporal-polyfill";
import type { TicketEpisode } from "~/domain/watch/types";

/**
 * 視聴遅延設定に基づいて、指定された上限時刻より前に公開・視聴可能になるエピソードのみをフィルタする。
 */
export const computeTickets = (
  limit: Temporal.ZonedDateTime,
  subscribedWorks: ReadonlyArray<{
    workId: number;
    watchDelaySecFromPublish: number;
  }>,
  episodes: ReadonlyArray<TicketEpisode>,
): TicketEpisode[] => {
  return episodes.filter((ep) => {
    const delay =
      subscribedWorks.find((s) => s.workId === ep.workId)
        ?.watchDelaySecFromPublish ?? 0;
    return ep.publishedAt.getTime() + delay * 1000 < limit.epochMilliseconds;
  });
};

/**
 * 同一 workId の中で最も publishedAt が古い（最も早く放送された）話数のみ
 * `watchReady: true` をセットして返す。
 * 入力の配列順序は保持される。
 */
export const setOldestOfWork = <
  T extends { workId: number; publishedAt: Date },
>(
  tickets: T[],
): Array<T & { watchReady: boolean }> => {
  const oldestIndex = new Map<number, number>();
  tickets.forEach((t, i) => {
    const existing = oldestIndex.get(t.workId);
    if (
      existing === undefined ||
      t.publishedAt.getTime() < tickets[existing].publishedAt.getTime()
    ) {
      oldestIndex.set(t.workId, i);
    }
  });
  return tickets.map((t, i) => ({
    ...t,
    watchReady: oldestIndex.get(t.workId) === i,
  }));
};
