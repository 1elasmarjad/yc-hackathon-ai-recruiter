import { BrowserUse } from "browser-use-sdk";
import { toDevpostMarkdown } from "./markdown";
import { DEVPOST_AGENT_SYSTEM_PROMPT, buildDevpostTaskPrompt } from "./prompt";
import { DEVPOST_ALLOWED_DOMAINS } from "./query";
import { DevpostAgentInputSchema, DevpostAgentStructuredOutputSchema } from "./schema";
import type { DevpostAgentRunner } from "./protocol";

export const Devpost_agent: DevpostAgentRunner = async (
  input,
  client = new BrowserUse(),
) => {
  const parsedInput = DevpostAgentInputSchema.parse(input);

  const taskResult = await client.run(
    buildDevpostTaskPrompt(parsedInput.profileUrl, parsedInput.fullName),
    {
      startUrl: parsedInput.profileUrl,
      allowedDomains: [...DEVPOST_ALLOWED_DOMAINS],
      schema: DevpostAgentStructuredOutputSchema,
      systemPromptExtension: DEVPOST_AGENT_SYSTEM_PROMPT,
      ...(parsedInput.sessionId ? { sessionId: parsedInput.sessionId } : {}),
      ...(parsedInput.maxSteps ? { maxSteps: parsedInput.maxSteps } : {}),
    },
  );

  const session = await client.sessions.get(taskResult.sessionId);
  const structured = DevpostAgentStructuredOutputSchema.parse(taskResult.output);
  return {
    markdown: toDevpostMarkdown(structured),
    liveUrl: session.liveUrl ?? null,
    sessionId: taskResult.sessionId,
  };
};
