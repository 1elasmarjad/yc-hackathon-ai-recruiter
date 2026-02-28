export const LINKEDIN_ALLOWED_DOMAINS = ["linkedin.com", "www.linkedin.com"] as const;

export const LINKEDIN_COLLECTION_RULES = [
  "Posts: collect only Featured posts or posts visible on screen. Never click to load more posts.",
  "Experience: scroll to Experience and collect all visible experience entries only.",
  "Projects: scroll to Projects and collect all visible projects. If there are no projects, end search.",
] as const;
