export const TWITTER_ALLOWED_DOMAINS = [
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
] as const;

export const TWITTER_COLLECTION_RULES = [
  "Open the provided profile URL and stay on the profile timeline.",
  "Collect exactly 10 top timeline posts, prioritizing pinned first and then newest visible posts.",
  "For each collected post, capture: postUrl, postId, content, publishedAt, likeCount, replyCount, repostCount, quoteCount, viewCount (if visible), bookmarkCount (if visible), and totalInteractions where totalInteractions = likeCount + replyCount + repostCount + quoteCount.",
  "For each collected post, collect exactly 10 visible replies sorted by platform relevance order (Top replies first).",
  "For each reply, capture: replyUrl, replyId, authorHandle, content, publishedAt, likeCount, and replyCount.",
  "Capture profile-level metrics once: profileUrl, name, handle, bio, followerCount, followingCount, postCount, verified status.",
  "Do not use posts from another profile.",
  "Do not exceed 10 posts or 10 replies per post.",
  "If any required metric is hidden, set it to null.",
] as const;
