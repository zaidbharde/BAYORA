export type RankedValue<T> = {
  value: T;
  rank: number;
  percentile: number;
};

/** Assigns competition ranks and percentile positions to comparable values. */
export function percentileRank<T>(
  values: readonly T[],
  compare: (a: T, b: T) => number = (a, b) => Number(a) - Number(b),
): RankedValue<T>[] {
  const ordered = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => compare(a.value, b.value) || a.index - b.index);
  const denominator = Math.max(ordered.length - 1, 1);
  const ranks = new Map<number, number>();

  ordered.forEach((entry, index) => {
    if (index === 0 || compare(ordered[index - 1].value, entry.value) !== 0) {
      ranks.set(index, index + 1);
    }
  });

  return ordered
    .map((entry, index) => ({
      value: entry.value,
      rank: [...ranks.entries()].reverse().find(([position]) => position <= index)?.[1] ?? 1,
      percentile: index / denominator,
    }))
    .sort((a, b) => compare(a.value, b.value));
}
