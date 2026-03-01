import type { GithubAgentStructuredOutput } from "./schema";

const formatOptional = (value: string | number | null): string => {
  if (value === null) {
    return "N/A";
  }

  return String(value);
};

export const toGithubMarkdown = (
  data: GithubAgentStructuredOutput,
): string => {
  const lines: string[] = [];

  lines.push("# GitHub Profile Summary");
  lines.push("");
  lines.push(`- Profile URL: ${data.profileUrl}`);
  lines.push(`- Display Name: ${formatOptional(data.displayName)}`);
  lines.push(`- Username: ${data.username}`);
  lines.push(`- Bio: ${formatOptional(data.bio)}`);
  lines.push(`- Public Repositories: ${formatOptional(data.repositoriesCount)}`);
  lines.push(`- Followers: ${formatOptional(data.followersCount)}`);
  lines.push(`- Following: ${formatOptional(data.followingCount)}`);
  lines.push("");
  lines.push("## Contributions");
  lines.push(`- Summary: ${formatOptional(data.contributionSummary)}`);
  lines.push(`- Period: ${formatOptional(data.contributionPeriod)}`);
  lines.push("");
  lines.push("## Pinned Repositories");

  if (data.pinnedRepositories.length === 0) {
    lines.push("No pinned repositories collected.");
  } else {
    data.pinnedRepositories.forEach((repository, index) => {
      lines.push("");
      lines.push(`### Repository ${index + 1}`);
      lines.push(`- Name: ${repository.name}`);
      lines.push(`- URL: ${repository.url}`);
      lines.push(`- Description: ${formatOptional(repository.description)}`);
      lines.push(`- Primary Language: ${formatOptional(repository.language)}`);
      lines.push(`- Stars: ${formatOptional(repository.stars)}`);
      lines.push(`- Forks: ${formatOptional(repository.forks)}`);
    });
  }

  if (data.topRepositories && data.topRepositories.length > 0) {
    lines.push("");
    lines.push("## Top Repositories");
    data.topRepositories.forEach((repository, index) => {
      lines.push("");
      lines.push(`### Top Repository ${index + 1}: ${repository.name}`);
      lines.push(`- URL: ${repository.url}`);
      lines.push(`- Files: ${repository.files ? repository.files.join(", ") : "N/A"}`);
      lines.push(`- README Summary: ${formatOptional(repository.readmeSummary)}`);
      if (repository.agentsMd) {
        lines.push("- agents.md Contents:");
        lines.push("```");
        lines.push(repository.agentsMd);
        lines.push("```");
      } else {
        lines.push(`- agents.md Content: ${formatOptional(repository.agentsMd)}`);
      }
    });
  }

  lines.push("");

  return lines.join("\n");
};
