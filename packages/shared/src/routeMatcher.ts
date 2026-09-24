export type RouteMatch = {
  params: Record<string, string>;
  pattern: string;
};

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function matchRoute(pattern: string, pathname: string): RouteMatch | null {
  const expected = pattern.split("/").filter(Boolean);
  const actual = pathname.split("/").filter(Boolean);
  if (expected.length !== actual.length) return null;

  const params: Record<string, string> = {};
  for (let index = 0; index < expected.length; index += 1) {
    const segment = expected[index];
    const value = actual[index];
    if (segment.startsWith(":")) params[segment.slice(1)] = decodeSegment(value);
    else if (segment !== value) return null;
  }
  return { params, pattern };
}
