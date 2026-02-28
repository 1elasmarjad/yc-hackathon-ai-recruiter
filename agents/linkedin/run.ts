import { BrowserUse } from "browser-use-sdk";
import { toLinkedinMarkdown } from "./markdown";
import {
  buildLinkedinTaskPrompt,
  LINKEDIN_AGENT_SYSTEM_PROMPT,
} from "./prompt";
import { LINKEDIN_ALLOWED_DOMAINS } from "./query";
import {
  LinkedinAgentInputSchema,
  LinkedinAgentStructuredOutputSchema,
} from "./schema";
import type { LinkedinAgentRunner } from "./protocol";

export const Linkedin_agent: LinkedinAgentRunner = async (
  input,
  client = new BrowserUse(),
) => {
  const parsedInput = LinkedinAgentInputSchema.parse(input);

  const taskResult = await client.run(
    buildLinkedinTaskPrompt(parsedInput.profileUrl),
    {
      startUrl: parsedInput.profileUrl,
      allowedDomains: [...LINKEDIN_ALLOWED_DOMAINS],
      schema: LinkedinAgentStructuredOutputSchema,
      systemPromptExtension: LINKEDIN_AGENT_SYSTEM_PROMPT,
      ...(parsedInput.sessionId ? { sessionId: parsedInput.sessionId } : {}),
      ...(parsedInput.maxSteps ? { maxSteps: parsedInput.maxSteps } : {}),
      ...(process.env.LINKEDIN_PROFILE_ID && !parsedInput.sessionId
        ? { sessionSettings: { profileId: process.env.LINKEDIN_PROFILE_ID } }
        : {}),
    },
  );

  const structured = LinkedinAgentStructuredOutputSchema.parse(taskResult.output);
  return toLinkedinMarkdown(structured);
};
