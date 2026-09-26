const UNITS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses compact duration values such as "2h 15m" into milliseconds. */
export function parseDuration(input: string): number {
  const value = input.trim().toLowerCase();
  if (!value) throw new Error("Duration cannot be empty");

  const tokenPattern = /(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)/g;
  let total = 0;
  let consumed = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(value)) !== null) {
    if (value.slice(consumed, match.index).trim() !== "") {
      throw new Error(`Invalid duration near: ${value.slice(consumed)}`);
    }
    total += Number(match[1]) * UNITS[match[2]];
    consumed = tokenPattern.lastIndex;
  }

  if (value.slice(consumed).trim() !== "" || !Number.isFinite(total)) {
    throw new Error(`Invalid duration: ${input}`);
  }
  return total;
}
