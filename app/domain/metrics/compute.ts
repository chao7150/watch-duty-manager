export const countOccurrence = (items: Array<string>): Map<string, number> => {
  return items.reduce((acc, val) => {
    const v = acc.get(val);
    if (v === undefined) {
      return acc.set(val, 1);
    }
    return acc.set(val, v + 1);
  }, new Map<string, number>());
};

export const mergeWeekMetrics = (
  weekKeys: string[],
  watchAchievements: Map<string, number>,
  dutyAccumulation: Map<string, number>,
): Array<{
  date: string;
  watchAchievements: number;
  dutyAccumulation: number;
}> =>
  weekKeys.map((k) => ({
    date: k,
    watchAchievements: watchAchievements.get(k) ?? 0,
    dutyAccumulation: dutyAccumulation.get(k) ?? 0,
  }));

export const computeCumulativeMetrics = (
  metrics: Array<{
    date: string;
    watchAchievements: number;
    dutyAccumulation: number;
  }>,
) =>
  metrics.reduce(
    (acc, val) => {
      if (acc.length === 0) {
        acc.push(val);
        return acc;
      }
      const last = acc[acc.length - 1];
      acc.push({
        date: val.date,
        watchAchievements: last.watchAchievements + val.watchAchievements,
        dutyAccumulation: last.dutyAccumulation + val.dutyAccumulation,
      });
      return acc;
    },
    [] as Array<{
      date: string;
      watchAchievements: number;
      dutyAccumulation: number;
    }>,
  );
