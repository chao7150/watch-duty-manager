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
