"use node";

import { createGateway, generateText, Output } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const DEFAULT_MODEL = "google/gemini-3.1-flash-image-preview";

const StartupVibeResultSchema = z.object({
  startupVibe: z
    .enum(["yes", "no"])
    .describe(
      "Whether the person on the call is open to or excited about working at a startup.",
    ),
});

const SYSTEM_PROMPT = `
You are an expert at analyzing phone conversation transcripts.
Your job is to determine whether the person being called is open to or excited about working at a startup.

Rules:
1. Focus on what the non-AI participant (the human/user) said, not the AI assistant.
2. If they express enthusiasm, openness, or willingness to work at a startup, answer "yes".
3. If they express reluctance, disinterest, preference for big companies, or clear rejection, answer "no".
4. If the conversation is ambiguous or too short to determine, lean toward "no".
`.trim();

function createAIGateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing AI_GATEWAY_API_KEY in environment. Add it to your Convex environment variables.",
    );
  }
  return createGateway({ apiKey });
}

export const summarizeCallForStartupVibe = action({
  args: {
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    const gateway = createAIGateway();

    const { output } = await generateText({
      model: gateway(DEFAULT_MODEL),
      system: SYSTEM_PROMPT,
      prompt: `Analyze this phone call transcript and determine if the person is down to work at a startup:\n\n${args.transcript}`,
      temperature: 0,
      output: Output.object({
        schema: StartupVibeResultSchema,
      }),
    });

    await ctx.runMutation(api.workflows.setStartupVibeForCalledCandidates, {
      startupVibe: output.startupVibe,
    });

    return { startupVibe: output.startupVibe };
  },
});
