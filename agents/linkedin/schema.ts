import { z } from "zod";

const LinkedinPostSchema = z.object({
  source: z.enum(["featured_post", "visible_post"]),
  content: z.string(),
  publishedAt: z.string().nullable(),
  reactionCount: z.number().int().nonnegative().nullable(),
  commentCount: z.number().int().nonnegative().nullable(),
});

const LinkedinExperienceSchema = z.object({
  title: z.string(),
  company: z.string().nullable(),
  dateRange: z.string().nullable(),
  location: z.string().nullable(),
  description: z.string().nullable(),
});

const LinkedinProjectSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  dateRange: z.string().nullable(),
  link: z.url().nullable(),
});

export const LinkedinAgentInputSchema = z.object({
  profileUrl: z.url(),
  sessionId: z.string().min(1).optional(),
  maxSteps: z.number().int().positive().optional(),
});

export const LinkedinAgentStructuredOutputSchema = z.object({
  profileUrl: z.url(),
  posts: z.array(LinkedinPostSchema),
  experience: z.array(LinkedinExperienceSchema),
  projects: z.array(LinkedinProjectSchema),
});

export type LinkedinAgentInput = z.input<typeof LinkedinAgentInputSchema>;
export type LinkedinAgentStructuredOutput = z.output<typeof LinkedinAgentStructuredOutputSchema>;
