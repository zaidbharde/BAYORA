export type Partition<T> = {
  left: T[];
  right: T[];
  leftWeight: number;
  rightWeight: number;
};

/** Greedily splits weighted items while preserving input order within each side. */
export function balancedPartition<T>(
  items: readonly T[],
  weight: (item: T) => number,
): Partition<T> {
  const result: Partition<T> = {
    left: [],
    right: [],
    leftWeight: 0,
    rightWeight: 0,
  };

  for (const item of items) {
    const itemWeight = weight(item);
    if (!Number.isFinite(itemWeight) || itemWeight < 0) {
      throw new RangeError("Weights must be finite and non-negative");
    }

    if (result.leftWeight <= result.rightWeight) {
      result.left.push(item);
      result.leftWeight += itemWeight;
    } else {
      result.right.push(item);
      result.rightWeight += itemWeight;
    }
  }

  return result;
}
