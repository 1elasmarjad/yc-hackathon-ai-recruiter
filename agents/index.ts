import type { BrowserUse } from "browser-use-sdk";
import type { LinkedinAgentInput } from "./linkedin/schema";
import { Linkedin_agent } from "./linkedin/run";

export type Agent = {
  name: "Linkedin_agent";
  description: string;
  run: (input: LinkedinAgentInput, client?: BrowserUse) => ReturnType<typeof Linkedin_agent>;
};

export const agents: { Linkedin_agent: Agent } = {
  Linkedin_agent: {
    name: "Linkedin_agent",
    description: "Browser Use LinkedIn scraper that returns markdown (.md) output.",
    run: Linkedin_agent,
  },
};

export { Linkedin_agent };
export type { LinkedinAgentInput, LinkedinAgentStructuredOutput } from "./linkedin/schema";
export type { LinkedinAgentResult } from "./linkedin/protocol";
