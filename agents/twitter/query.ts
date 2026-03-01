export const TWITTER_ALLOWED_DOMAINS = [
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
] as const;

export const TWITTER_COLLECTION_RULES = [
  "Input: process every provided X/Twitter profile URL in order.",
  "Profile: collect display name, handle, bio, followers count, following count, and post count if visible.",
  "Top posts: open the Posts tab and collect exactly 10 authored posts. Prefer pinned first (if present), then highest visible interaction posts while scrolling.",
  "Replies: open the Replies tab and collect exactly 10 authored replies.",
  "Post metrics: for each collected post/reply, collect URL, text, published date, like count, reply count, repost count, quote count, bookmark count (if visible), and view count (if visible).",
  "Comments: for each collected top post, open the post and collect up to 10 visible comments/replies with commenter handle, text, date, like count, and reply count.",
  "Interactions: include total interactions per post as the sum of all visible interaction counts.",
  "Data quality: do not invent values. Use null when a field is truly not visible.",
  "Failure policy: if login/captcha/rate limits prevent collection, stop and return a failure reason instead of partial guessed data.",
] as const;
