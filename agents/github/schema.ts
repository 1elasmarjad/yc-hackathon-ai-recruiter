import { z } from "zod";

const GithubRepositorySchema = z.object({
  name: z.string(),
  url: z.url(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  stars: z.number().int().nonnegative().nullable(),
  forks: z.number().int().nonnegative().nullable(),
});

export const GithubAgentInputSchema = z.object({
  profileUrl: z.url(),
  sessionId: z.string().min(1).optional(),
  maxSteps: z.number().int().positive().optional(),
});

const TopRepositorySchema = z.object({
  name: z.string(),
  url: z.url(),
  files: z.array(z.string()).nullable(),
  readmeSummary: z.string().nullable(),
  agentsMd: z.string().nullable(),
});

export const GithubAgentStructuredOutputSchema = z.object({
  profileUrl: z.url(),
  displayName: z.string().nullable(),
  username: z.string(),
  bio: z.string().nullable(),
  repositoriesCount: z.number().int().nonnegative().nullable(),
  followersCount: z.number().int().nonnegative().nullable(),
  followingCount: z.number().int().nonnegative().nullable(),
  contributionSummary: z.string().nullable(),
  contributionPeriod: z.string().nullable(),
  pinnedRepositories: z.array(GithubRepositorySchema).max(6),
  topRepositories: z.array(TopRepositorySchema).max(2).optional(),
});

export type GithubAgentInput = z.input<typeof GithubAgentInputSchema>;
export type GithubAgentStructuredOutput = z.output<typeof GithubAgentStructuredOutputSchema>;
