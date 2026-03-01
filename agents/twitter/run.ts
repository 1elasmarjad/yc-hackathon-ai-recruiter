import { BrowserUse } from "browser-use-sdk";
import { toTwitterMarkdown } from "./markdown";
import { buildTwitterTaskPrompt, TWITTER_AGENT_SYSTEM_PROMPT } from "./prompt";
import { TWITTER_ALLOWED_DOMAINS } from "./query";
import { TwitterAgentInputSchema, TwitterAgentStructuredOutputSchema } from "./schema";
import type { TwitterAgentRunner } from "./protocol";

export const Twitter_agent: TwitterAgentRunner = async (
  input,
  client = new BrowserUse(),
) => {
  const parsedInput = TwitterAgentInputSchema.parse(input);

  const taskResult = await client.run(
    buildTwitterTaskPrompt(parsedInput.profileUrls),
    {
      startUrl: parsedInput.profileUrls[0],
      allowedDomains: [...TWITTER_ALLOWED_DOMAINS],
      schema: TwitterAgentStructuredOutputSchema,
      systemPromptExtension: TWITTER_AGENT_SYSTEM_PROMPT,
      ...(parsedInput.sessionId ? { sessionId: parsedInput.sessionId } : {}),
      ...(parsedInput.maxSteps ? { maxSteps: parsedInput.maxSteps } : {}),
      ...(process.env.TWITTER_PROFILE_ID && !parsedInput.sessionId
        ? { sessionSettings: { profileId: process.env.TWITTER_PROFILE_ID } }
        : {}),
    },
  );

  const structured = TwitterAgentStructuredOutputSchema.parse(taskResult.output);
  return toTwitterMarkdown(structured);
};
