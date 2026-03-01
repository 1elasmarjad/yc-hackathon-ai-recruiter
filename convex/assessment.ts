"use node";

import { createGateway, generateText, Output } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { action } from "./_generated/server";

const DEFAULT_ASSESSMENT_MODEL = "openai/gpt-5-mini";

const CandidateMarkdownInputSchema = z.union([
  z.string().trim().min(1),
  z.array(z.string().trim().min(1)).min(1),
]);

const AssessmentResultSchema = z.object({
  isFit: z.boolean(),
  evidence: z
    .array(z.string().trim().min(1))
    .describe("Short evidence snippets pulled from the candidate markdown."),
});

const AssessmentArgsSchema = z.object({
  aiCriteria: z.string().trim().min(1),
  candidateMarkdown: CandidateMarkdownInputSchema,
});

type AssessmentResult = z.output<typeof AssessmentResultSchema>;

const ASSESSMENT_SYSTEM_PROMPT = `
You are a strict AI recruiting assessor.
Decide if a candidate fits the given AI hiring criteria.
Rules:
1. Return only fields defined by schema.
2. Set isFit to true only when there is concrete support in the candidate markdown.
3. If isFit is true, include concise evidence snippets from the markdown.
4. If isFit is false, evidence must be an empty array.
`.trim();

function normalizeMarkdownInput(
  input: z.input<typeof CandidateMarkdownInputSchema>,
): string[] {
  const parsed = CandidateMarkdownInputSchema.parse(input);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function buildAssessmentPrompt(aiCriteria: string, candidateMarkdown: string[]): string {
  const docs = candidateMarkdown
    .map((markdown, index) => `### Candidate Markdown ${index + 1}\n${markdown}`)
    .join("\n\n");

  return `
Assess if this candidate fits the AI criteria below.

## AI Criteria
${aiCriteria}

## Candidate Data
${docs}
`.trim();
}

export const assessCandidateFit = action({
  args: {
    aiCriteria: v.string(),
    candidateMarkdown: v.union(v.string(), v.array(v.string())),
  },
  handler: async (_ctx, args): Promise<AssessmentResult> => {
    const parsedArgs = AssessmentArgsSchema.parse(args);

    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing AI_GATEWAY_API_KEY in environment. Add it to your Convex environment variables.",
      );
    }

    const gateway = createGateway({ apiKey });
    const normalizedMarkdown = normalizeMarkdownInput(parsedArgs.candidateMarkdown);

    const { output } = await generateText({
      model: gateway(DEFAULT_ASSESSMENT_MODEL),
      system: ASSESSMENT_SYSTEM_PROMPT,
      prompt: buildAssessmentPrompt(parsedArgs.aiCriteria, normalizedMarkdown),
      temperature: 0,
      output: Output.object({
        schema: AssessmentResultSchema,
      }),
    });

    if (output.isFit && output.evidence.length === 0) {
      throw new Error("Invalid model output: evidence is required when isFit is true.");
    }

    if (!output.isFit && output.evidence.length > 0) {
      throw new Error("Invalid model output: evidence must be empty when isFit is false.");
    }

    return output;
  },
});
