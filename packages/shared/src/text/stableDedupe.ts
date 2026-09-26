/** Removes duplicate strings while keeping the first-seen spelling and order. */
export function stableDedupe(
  values: readonly string[],
  normalize: (value: string) => string = (value) => value,
): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const key = normalize(value);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }

  return unique;
}

export function dedupeNonEmpty(values: readonly string[]): string[] {
  return stableDedupe(
    values.map((value) => value.trim()).filter(Boolean),
    (value) => value.toLocaleLowerCase(),
  );
}
