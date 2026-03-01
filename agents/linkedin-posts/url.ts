const LINKEDIN_POSTS_PATH_PREFIX = "/posts/";

function isLinkedinHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return normalizedHostname === "linkedin.com" || normalizedHostname === "www.linkedin.com";
}

export function canonicalizeUrl(url: string): string | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return null;
  }

  const normalizedPath = parsedUrl.pathname.replace(/\/+$/, "") || "/";
  const normalizedHostname = parsedUrl.hostname.toLowerCase();
  const normalizedPort =
    parsedUrl.port === "" || parsedUrl.port === "80" || parsedUrl.port === "443"
      ? ""
      : `:${parsedUrl.port}`;

  return `https://${normalizedHostname}${normalizedPort}${normalizedPath}`;
}

export function dedupePreserveOrder<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const deduped: T[] = [];

  for (const item of items) {
    if (seen.has(item)) {
      continue;
    }

    seen.add(item);
    deduped.push(item);
  }

  return deduped;
}

export function isLinkedInPostUrl(url: string): boolean {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return false;
  }

  if (!isLinkedinHostname(parsedUrl.hostname)) {
    return false;
  }

  return parsedUrl.pathname.toLowerCase().startsWith(LINKEDIN_POSTS_PATH_PREFIX);
}

export function extractPostSlug(url: string): string | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const pathSegments = parsedUrl.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");

  if (pathSegments.length < 2 || pathSegments[0].toLowerCase() !== "posts") {
    return null;
  }

  const slug = pathSegments[1];
  return slug ? decodeURIComponent(slug) : null;
}

export function extractLinkedinUsernameFromProfileUrl(profileUrl: string): string | null {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(profileUrl);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return null;
  }

  if (!isLinkedinHostname(parsedUrl.hostname)) {
    return null;
  }

  const pathSegments = parsedUrl.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");

  if (pathSegments.length < 2 || pathSegments[0].toLowerCase() !== "in") {
    return null;
  }

  const username = pathSegments[1];

  if (!username) {
    return null;
  }

  return decodeURIComponent(username);
}
