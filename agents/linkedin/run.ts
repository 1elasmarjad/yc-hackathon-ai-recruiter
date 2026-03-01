import { BrowserUse } from "browser-use-sdk";
import {
  buildLinkedinTaskPrompt,
  LINKEDIN_AGENT_SYSTEM_PROMPT,
} from "./prompt";
import { LINKEDIN_ALLOWED_DOMAINS } from "./query";
import { LinkedinAgentInputSchema } from "./schema";
import { buildLinkedinSessionSettings } from "./session-settings";
import type { LinkedinAgentRunner } from "./protocol";

export const Linkedin_agent: LinkedinAgentRunner = async (
  input,
  client = new BrowserUse(),
) => {
  const parsedInput = LinkedinAgentInputSchema.parse(input);
  const sessionSettings = !parsedInput.sessionId
    ? buildLinkedinSessionSettings({
        profileId: process.env.LINKEDIN_PROFILE_ID,
        proxyCountryCode: process.env.LINKEDIN_PROXY_COUNTRY_CODE,
      })
    : undefined;

  const taskResult = await client.run(
    buildLinkedinTaskPrompt(parsedInput.profileUrl),
    {
      startUrl: "https://www.google.com",
      allowedDomains: ["google.com", "www.google.com", ...LINKEDIN_ALLOWED_DOMAINS],
      systemPromptExtension: LINKEDIN_AGENT_SYSTEM_PROMPT,
      ...(parsedInput.sessionId ? { sessionId: parsedInput.sessionId } : {}),
      ...(parsedInput.maxSteps ? { maxSteps: parsedInput.maxSteps } : {}),
      ...(sessionSettings ? { sessionSettings } : {}),
    },
  );

  if (typeof taskResult.output !== "string" || taskResult.output.trim() === "") {
    throw new Error("Linkedin_agent finished without markdown output.");
  }

  return taskResult.output;
};
