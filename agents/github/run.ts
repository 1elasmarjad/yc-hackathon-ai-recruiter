import { BrowserUse } from "browser-use-sdk";
import { toGithubMarkdown } from "./markdown";
import { buildGithubTaskPrompt, GITHUB_AGENT_SYSTEM_PROMPT } from "./prompt";
import { GITHUB_ALLOWED_DOMAINS } from "./query";
import { GithubAgentInputSchema, GithubAgentStructuredOutputSchema } from "./schema";
import type { GithubAgentRunner } from "./protocol";

export const Github_agent: GithubAgentRunner = async (
  input,
  client = new BrowserUse(),
) => {
  const parsedInput = GithubAgentInputSchema.parse(input);

  const taskResult = await client.run(
    buildGithubTaskPrompt(parsedInput.profileUrl),
    {
      startUrl: parsedInput.profileUrl,
      allowedDomains: [...GITHUB_ALLOWED_DOMAINS],
      schema: GithubAgentStructuredOutputSchema,
      systemPromptExtension: GITHUB_AGENT_SYSTEM_PROMPT,
      ...(parsedInput.sessionId ? { sessionId: parsedInput.sessionId } : {}),
      ...(parsedInput.maxSteps ? { maxSteps: parsedInput.maxSteps } : {}),
    },
  );

  const structured = GithubAgentStructuredOutputSchema.parse(taskResult.output);
  return toGithubMarkdown(structured);
};
