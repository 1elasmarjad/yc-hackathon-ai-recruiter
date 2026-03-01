import type { DevpostAgentStructuredOutput } from "./schema";

const formatOptional = (value: string | number | null): string => {
  if (value === null) {
    return "N/A";
  }

  return String(value);
};

export function toDevpostMarkdown(data: DevpostAgentStructuredOutput): string {
  const lines: string[] = [];

  lines.push("# Devpost Scrape Report");
  lines.push("");
  lines.push(`- Profile URL: ${data.profileUrl}`);
  lines.push("");
  lines.push("## High-Level Summary");
  lines.push(data.highLevelSummary);
  lines.push("");
  lines.push("## Wins");

  if (data.wins.length === 0) {
    lines.push("No wins found.");
  } else {
    data.wins.forEach((win, index) => {
      lines.push("");
      lines.push(`### Win ${index + 1}`);
      lines.push(`- Title: ${win.title}`);
      lines.push(`- Event: ${formatOptional(win.event)}`);
      lines.push(`- Year: ${formatOptional(win.year)}`);
      lines.push(`- Placement: ${formatOptional(win.placement)}`);
    });
  }

  lines.push("");
  lines.push("## Built Projects");

  if (data.builtProjects.length === 0) {
    lines.push("No projects found.");
  } else {
    data.builtProjects.forEach((project, index) => {
      lines.push("");
      lines.push(`### Project ${index + 1}`);
      lines.push(`- Name: ${project.name}`);
      lines.push(`- Description: ${formatOptional(project.description)}`);
      lines.push(
        `- Technologies/Tags: ${project.techOrTags.length > 0 ? project.techOrTags.join(", ") : "N/A"}`,
      );
      lines.push(`- URL: ${formatOptional(project.projectUrl)}`);
    });
  }

  lines.push("");
  return lines.join("\n");
}
