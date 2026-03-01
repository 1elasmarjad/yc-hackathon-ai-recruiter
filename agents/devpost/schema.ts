import { z } from "zod";

const DevpostWinSchema = z.object({
  title: z.string(),
  event: z.string().nullable(),
  year: z.string().nullable(),
  placement: z.string().nullable(),
});

const DevpostBuiltProjectSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  techOrTags: z.array(z.string()),
  projectUrl: z.url().nullable(),
});

export const DevpostAgentInputSchema = z.object({
  fullName: z.string().trim().min(1),
  profileUrl: z.url(),
  sessionId: z.string().min(1).optional(),
  maxSteps: z.number().int().positive().optional(),
});

export const DevpostAgentStructuredOutputSchema = z.object({
  profileUrl: z.url(),
  wins: z.array(DevpostWinSchema),
  builtProjects: z.array(DevpostBuiltProjectSchema),
  highLevelSummary: z.string(),
});

export type DevpostAgentInput = z.input<typeof DevpostAgentInputSchema>;
export type DevpostAgentStructuredOutput = z.output<typeof DevpostAgentStructuredOutputSchema>;
