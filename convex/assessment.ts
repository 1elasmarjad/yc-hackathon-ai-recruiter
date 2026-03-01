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

const CriteriaListSchema = z.object({
  criteria: z
    .array(z.string().trim().min(1))
    .min(1)
    .describe("Individual assessment criteria extracted from the user prompt."),
});

const SingleCriterionResultSchema = z.object({
  isFit: z.boolean(),
  evidence: z
    .array(z.string().trim().min(1))
    .describe("Short evidence snippets pulled from the candidate markdown."),
});

const CriterionResultSchema = z.object({
  criterion: z.string(),
  isFit: z.boolean(),
  evidence: z
    .array(z.string().trim().min(1))
    .describe("Short evidence snippets pulled from the candidate markdown."),
});

const AssessmentResultSchema = z.object({
  isFit: z.boolean().describe("True only when ALL individual criteria are met."),
  criteriaResults: z.array(CriterionResultSchema),
});

const AssessmentArgsSchema = z.object({
  aiCriteria: z.string().trim().min(1),
  candidateMarkdown: CandidateMarkdownInputSchema,
});

export type CriterionResult = z.output<typeof CriterionResultSchema>;
export type AssessmentResult = z.output<typeof AssessmentResultSchema>;

const CRITERIA_SPLIT_SYSTEM_PROMPT = `
You are a recruiting criteria analyst.
Given a hiring prompt, split it into individual, independent assessment criteria.
Rules:
1. Each criterion should be a single, specific, assessable requirement.
2. Preserve the intent and specificity of the original prompt.
3. If the prompt is already a single criterion, return it as a one-element array.
4. Do not add criteria that are not in the original prompt.
`.trim();

const ASSESSMENT_SYSTEM_PROMPT = `
You are a strict AI recruiting assessor.
Decide if a candidate fits the given hiring criterion.
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

function buildAssessmentPrompt(criterion: string, candidateMarkdown: string[]): string {
  const docs = candidateMarkdown
    .map((markdown, index) => `### Candidate Markdown ${index + 1}\n${markdown}`)
    .join("\n\n");

  return `
Assess if this candidate fits the criterion below.

## Criterion
${criterion}

## Candidate Data
${docs}
`.trim();
}

function createAIGateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing AI_GATEWAY_API_KEY in environment. Add it to your Convex environment variables.",
    );
  }
  return createGateway({ apiKey });
}

async function splitCriteriaFromPrompt(
  gateway: ReturnType<typeof createGateway>,
  aiCriteria: string,
): Promise<string[]> {
  const { output } = await generateText({
    model: gateway(DEFAULT_ASSESSMENT_MODEL),
    system: CRITERIA_SPLIT_SYSTEM_PROMPT,
    prompt: `Split the following hiring prompt into individual assessment criteria:\n\n${aiCriteria}`,
    temperature: 0,
    output: Output.object({
      schema: CriteriaListSchema,
    }),
  });

  return output.criteria;
}

async function assessSingleCriterion(
  gateway: ReturnType<typeof createGateway>,
  criterion: string,
  candidateMarkdown: string[],
): Promise<z.output<typeof SingleCriterionResultSchema>> {
  const { output } = await generateText({
    model: gateway(DEFAULT_ASSESSMENT_MODEL),
    system: ASSESSMENT_SYSTEM_PROMPT,
    prompt: buildAssessmentPrompt(criterion, candidateMarkdown),
    temperature: 0,
    output: Output.object({
      schema: SingleCriterionResultSchema,
    }),
  });

  if (output.isFit && output.evidence.length === 0) {
    throw new Error("Invalid model output: evidence is required when isFit is true.");
  }

  if (!output.isFit && output.evidence.length > 0) {
    throw new Error("Invalid model output: evidence must be empty when isFit is false.");
  }

  return output;
}

export const splitCriteria = action({
  args: {
    aiCriteria: v.string(),
  },
  handler: async (_ctx, args): Promise<string[]> => {
    const trimmed = args.aiCriteria.trim();
    if (trimmed.length === 0) {
      throw new Error("aiCriteria must not be empty.");
    }

    const gateway = createAIGateway();
    return await splitCriteriaFromPrompt(gateway, trimmed);
  },
});

export const assessCandidateFit = action({
  args: {
    aiCriteria: v.string(),
    candidateMarkdown: v.union(v.string(), v.array(v.string())),
  },
  handler: async (_ctx, args): Promise<AssessmentResult> => {
    const parsedArgs = AssessmentArgsSchema.parse(args);
    const gateway = createAIGateway();
    const normalizedMarkdown = normalizeMarkdownInput(parsedArgs.candidateMarkdown);

    const criteria = await splitCriteriaFromPrompt(gateway, parsedArgs.aiCriteria);

    const criteriaResults: CriterionResult[] = await Promise.all(
      criteria.map(async (criterion) => {
        const result = await assessSingleCriterion(gateway, criterion, normalizedMarkdown);
        return { criterion, ...result };
      }),
    );

    const isFit = criteriaResults.every((r) => r.isFit);

    return { isFit, criteriaResults };
  },
});
