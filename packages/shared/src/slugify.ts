const combiningMarks = /[\u0300-\u036f]/g;
const nonWordCharacters = /[^a-z0-9]+/g;

export function slugify(value: string, fallback = "item"): string {
  const normalized = value
    .normalize("NFKD")
    .replace(combiningMarks, "")
    .toLowerCase()
    .trim()
    .replace(nonWordCharacters, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

export function uniqueSlug(value: string, taken: ReadonlySet<string>): string {
  const base = slugify(value);
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function slugPath(parts: readonly string[]): string {
  return parts.map((part) => slugify(part)).filter(Boolean).join("/");
}
