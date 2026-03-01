import { z } from "zod";

export const LinkedinAgentInputSchema = z.object({
    linkedinUrl: z.string().min(1),
    sessionId: z.string().min(1).optional(),
    maxSteps: z.number().int().positive().optional(),
});

export const LinkedinAgentStructuredOutputSchema = z.object({
    profileUrl: z.string().min(1),
    name: z.string().nullable(),
    headline: z.string().nullable(),
    location: z.string().nullable(),
    about: z.string().nullable(),
    activity: z.array(z.string()),
    projects: z.array(z.object({
        name: z.string(),
        description: z.string().nullable(),
        url: z.string().url().nullable().optional()
    })),
    interests: z.string().nullable(),
    images: z.array(z.string().url()),
});

export type LinkedinAgentInput = z.input<typeof LinkedinAgentInputSchema>;
export type LinkedinAgentStructuredOutput = z.output<typeof LinkedinAgentStructuredOutputSchema>;
