import type { LinkedinAgentStructuredOutput } from "./schema";

const formatOptional = (value: string | number | null): string => {
  if (value === null) {
    return "N/A";
  }

  return String(value);
};

export const toLinkedinMarkdown = (
  data: LinkedinAgentStructuredOutput,
): string => {
  const lines: string[] = [];

  lines.push("# LinkedIn Scrape Report");
  lines.push("");
  lines.push(`- Profile URL: ${data.profileUrl}`);
  lines.push("");
  lines.push("## Posts");

  if (data.posts.length === 0) {
    lines.push("No posts collected.");
  } else {
    data.posts.forEach((post, index) => {
      lines.push("");
      lines.push(`### Post ${index + 1}`);
      lines.push(`- Source: ${post.source}`);
      lines.push(`- Content: ${post.content}`);
      lines.push(`- Published At: ${formatOptional(post.publishedAt)}`);
      lines.push(`- Reactions: ${formatOptional(post.reactionCount)}`);
      lines.push(`- Comments: ${formatOptional(post.commentCount)}`);
    });
  }

  lines.push("");
  lines.push("## Experience");

  if (data.experience.length === 0) {
    lines.push("No experience entries collected.");
  } else {
    data.experience.forEach((item, index) => {
      lines.push("");
      lines.push(`### Experience ${index + 1}`);
      lines.push(`- Title: ${item.title}`);
      lines.push(`- Company: ${formatOptional(item.company)}`);
      lines.push(`- Date Range: ${formatOptional(item.dateRange)}`);
      lines.push(`- Location: ${formatOptional(item.location)}`);
      lines.push(`- Description: ${formatOptional(item.description)}`);
    });
  }

  lines.push("");
  lines.push("## Projects");

  if (data.projects.length === 0) {
    lines.push("No projects collected.");
  } else {
    data.projects.forEach((project, index) => {
      lines.push("");
      lines.push(`### Project ${index + 1}`);
      lines.push(`- Name: ${project.name}`);
      lines.push(`- Description: ${formatOptional(project.description)}`);
      lines.push(`- Date Range: ${formatOptional(project.dateRange)}`);
      lines.push(`- Link: ${formatOptional(project.link)}`);
    });
  }

  lines.push("");

  return lines.join("\n");
};
