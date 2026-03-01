import type {
  LinkedinPostsBrowserUseOutput,
  LinkedinPostsVerification,
} from "./schema";

type LinkedinPostsMarkdownInput = {
  fullName: string;
  linkedinProfileUrl: string;
  verification: LinkedinPostsVerification;
  analyzedUrlCount: number;
  analysis: LinkedinPostsBrowserUseOutput | null;
};

export function toLinkedinPostsMarkdown(input: LinkedinPostsMarkdownInput): string {
  const lines: string[] = [];

  lines.push("# LinkedIn Posts Summary");
  lines.push("");
  lines.push(`- Full Name: ${input.fullName}`);
  lines.push(`- LinkedIn Profile URL: ${input.linkedinProfileUrl}`);
  lines.push(`- Derived Username: ${input.verification.derivedUsername}`);
  lines.push(`- Search Query: ${input.verification.query}`);
  lines.push(`- Search Results: ${input.verification.searchResultCount}`);
  lines.push(`- Candidate URLs: ${input.verification.candidateUrlCount}`);
  lines.push(`- Verified URLs: ${input.verification.verifiedUrls.length}`);
  lines.push(`- Analyzed URLs: ${input.analyzedUrlCount}`);
  lines.push("");

  lines.push("## Verified URLs");
  if (input.verification.verifiedUrls.length === 0) {
    lines.push("No verified LinkedIn post URLs found.");
  } else {
    for (const url of input.verification.verifiedUrls) {
      lines.push(`- ${url}`);
    }
  }

  lines.push("");
  lines.push("## What They Post About");

  if (!input.analysis || input.analysis.posts.length === 0) {
    lines.push("No verified posts were analyzed.");
    lines.push("");
    return lines.join("\n");
  }

  if (input.analysis.overallTopics.length === 0) {
    lines.push("No overall topics extracted.");
  } else {
    lines.push("### Overall Topics");
    for (const topic of input.analysis.overallTopics) {
      lines.push(`- ${topic}`);
    }
  }

  lines.push("");
  lines.push("### Post Summaries");

  input.analysis.posts.forEach((post, index) => {
    lines.push("");
    lines.push(`#### Post ${index + 1}`);
    lines.push(`- URL: ${post.url}`);
    lines.push(`- Summary: ${post.summary}`);
    lines.push(`- Topics: ${post.topics.length > 0 ? post.topics.join(", ") : "N/A"}`);
  });

  lines.push("");
  return lines.join("\n");
}
