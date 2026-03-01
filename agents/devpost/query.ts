export const DEVPOST_SEARCH_LIMIT = 10;

export const DEVPOST_ALLOWED_DOMAINS = ["devpost.com", "www.devpost.com"] as const;

const BLOCKED_DEVPOST_ROOT_SEGMENTS = new Set([
  "software",
  "hackathons",
  "organizations",
  "organization",
  "updates",
  "blog",
  "search",
  "about",
  "guidelines",
  "privacy",
  "terms",
  "jobs",
  "contact",
]);

function isAllowedDevpostHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return (
    normalizedHostname === DEVPOST_ALLOWED_DOMAINS[0] ||
    normalizedHostname === DEVPOST_ALLOWED_DOMAINS[1]
  );
}

export function normalizeDevpostUserProfileUrl(url: string): string | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return null;
  }

  if (!isAllowedDevpostHostname(parsedUrl.hostname)) {
    return null;
  }

  const pathSegments = parsedUrl.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");

  if (pathSegments.length !== 1) {
    return null;
  }

  const [handle] = pathSegments;

  if (BLOCKED_DEVPOST_ROOT_SEGMENTS.has(handle.toLowerCase())) {
    return null;
  }

  return `https://devpost.com/${encodeURIComponent(handle)}`;
}

export function isStrictDevpostUserProfileUrl(url: string): boolean {
  return normalizeDevpostUserProfileUrl(url) !== null;
}
