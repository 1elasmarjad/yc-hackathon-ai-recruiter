import type { TwitterAgentStructuredOutput } from "./schema";

const formatOptional = (value: string | number | null): string => {
  if (value === null) {
    return "N/A";
  }

  return String(value);
};

const pushPostMetrics = (
  lines: string[],
  post: {
    postUrl: string | null;
    text: string;
    publishedAt: string | null;
    likeCount: number | null;
    replyCount: number | null;
    repostCount: number | null;
    quoteCount: number | null;
    bookmarkCount: number | null;
    viewCount: number | null;
    interactionTotal: number | null;
  },
) => {
  lines.push(`- URL: ${formatOptional(post.postUrl)}`);
  lines.push(`- Text: ${post.text}`);
  lines.push(`- Published At: ${formatOptional(post.publishedAt)}`);
  lines.push(`- Likes: ${formatOptional(post.likeCount)}`);
  lines.push(`- Replies: ${formatOptional(post.replyCount)}`);
  lines.push(`- Reposts: ${formatOptional(post.repostCount)}`);
  lines.push(`- Quotes: ${formatOptional(post.quoteCount)}`);
  lines.push(`- Bookmarks: ${formatOptional(post.bookmarkCount)}`);
  lines.push(`- Views: ${formatOptional(post.viewCount)}`);
  lines.push(`- Total Interactions: ${formatOptional(post.interactionTotal)}`);
};

export const toTwitterMarkdown = (
  data: TwitterAgentStructuredOutput,
): string => {
  const lines: string[] = [];

  lines.push("# Twitter/X Scrape Report");
  lines.push("");
  lines.push(`- Status: ${data.status}`);
  lines.push(`- Failure Reason: ${formatOptional(data.failureReason)}`);
  lines.push("");
  lines.push("## Profiles");

  if (data.profiles.length === 0) {
    lines.push("No profiles collected.");
    lines.push("");
    return lines.join("\n");
  }

  data.profiles.forEach((profile, profileIndex) => {
    lines.push("");
    lines.push(`### Profile ${profileIndex + 1}`);
    lines.push(`- Profile URL: ${profile.profileUrl}`);
    lines.push(`- Display Name: ${profile.displayName}`);
    lines.push(`- Handle: ${profile.handle}`);
    lines.push(`- Bio: ${formatOptional(profile.bio)}`);
    lines.push(`- Followers: ${formatOptional(profile.followersCount)}`);
    lines.push(`- Following: ${formatOptional(profile.followingCount)}`);
    lines.push(`- Post Count: ${formatOptional(profile.postCount)}`);
    lines.push("");
    lines.push("#### Top Posts");

    if (profile.topPosts.length === 0) {
      lines.push("No top posts collected.");
    } else {
      profile.topPosts.forEach((post, postIndex) => {
        lines.push("");
        lines.push(`##### Top Post ${postIndex + 1}`);
        pushPostMetrics(lines, post);
        lines.push("- Comments:");

        if (post.comments.length === 0) {
          lines.push("  - No comments collected.");
        } else {
          post.comments.forEach((comment, commentIndex) => {
            lines.push(`  - Comment ${commentIndex + 1}`);
            lines.push(`    - Handle: ${comment.commenterHandle}`);
            lines.push(`    - Text: ${comment.text}`);
            lines.push(`    - Published At: ${formatOptional(comment.publishedAt)}`);
            lines.push(`    - Likes: ${formatOptional(comment.likeCount)}`);
            lines.push(`    - Replies: ${formatOptional(comment.replyCount)}`);
          });
        }
      });
    }

    lines.push("");
    lines.push("#### Replies");

    if (profile.replies.length === 0) {
      lines.push("No replies collected.");
    } else {
      profile.replies.forEach((reply, replyIndex) => {
        lines.push("");
        lines.push(`##### Reply ${replyIndex + 1}`);
        pushPostMetrics(lines, reply);
      });
    }
  });

  lines.push("");
  return lines.join("\n");
};
