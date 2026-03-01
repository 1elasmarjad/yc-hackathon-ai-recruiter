export const GITHUB_ALLOWED_DOMAINS = ["github.com", "www.github.com"] as const;
export const GITHUB_SEARCH_LIMIT = 10;

const BLOCKED_GITHUB_ROOT_SEGMENTS = new Set([
  "about",
  "account",
  "apps",
  "blog",
  "collections",
  "contact",
  "customer-stories",
  "enterprise",
  "events",
  "explore",
  "features",
  "gist",
  "global-campus",
  "issues",
  "login",
  "marketplace",
  "mobile",
  "new",
  "notifications",
  "orgs",
  "organizations",
  "pricing",
  "pulls",
  "readme",
  "search",
  "security",
  "settings",
  "signup",
  "site",
  "solutions",
  "sponsors",
  "team",
  "topics",
  "trending",
]);

function isAllowedGithubHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return (
    normalizedHostname === GITHUB_ALLOWED_DOMAINS[0] ||
    normalizedHostname === GITHUB_ALLOWED_DOMAINS[1]
  );
}

export function normalizeGithubProfileUrl(url: string): string | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return null;
  }

  if (!isAllowedGithubHostname(parsedUrl.hostname)) {
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

  if (handle.startsWith("@")) {
    return null;
  }

  if (BLOCKED_GITHUB_ROOT_SEGMENTS.has(handle.toLowerCase())) {
    return null;
  }

  return `https://github.com/${encodeURIComponent(handle)}`;
}

export function isStrictGithubProfileUrl(url: string): boolean {
  return normalizeGithubProfileUrl(url) !== null;
}

export const GITHUB_COLLECTION_RULES = [
  "Input: open the provided GitHub profile URL and stay on github.com.",
  "Contribution summary: capture the exact visible contributions headline and period text shown near the contributions graph on initial profile load.",
  "Profile: collect display name, username, bio, repositories count, followers count, and following count if visible.",
  "Pinned Repositories: collect up to 6 pinned repositories visible on initial profile load and capture repository name, URL, description, primary language, stars, and forks.",
  "Top Repositories Info: Navigate to the user's Repositories tab, click the 'Sort' button and select 'Stars'. For the top 2 starred repositories, click into each repository. For each, capture the repository name and URL, create a list of all visible files and folders, extract a brief summary of the README.md, and look for a file named 'agents.md' and extract its ENTIRE contents verbatim (or use null if not found). Navigate back to the sorted repositories page between checking the two repos.",
  "Data quality: extract only visible values, never infer missing counts, and use null when a field is not visible.",
] as const;
