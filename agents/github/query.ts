export const GITHUB_ALLOWED_DOMAINS = ["github.com", "www.github.com"] as const;

export const GITHUB_COLLECTION_RULES = [
  "Input: open the provided GitHub profile URL and stay on that profile.",
  "Contribution summary: capture the exact visible contributions headline and period text shown near the contributions graph on initial profile load.",
  "Profile: collect display name, username, bio, repositories count, followers count, and following count if visible.",
  "Repositories: collect up to 6 pinned repositories visible on initial profile load and capture repository name, URL, description, primary language, stars, and forks.",
  "Data quality: extract only visible values, never infer missing counts, and use null when a field is not visible.",
] as const;
