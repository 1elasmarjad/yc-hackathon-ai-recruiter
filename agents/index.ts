import type { BrowserUse } from "browser-use-sdk";
import type { LinkedinAgentInput } from "./linkedin/schema";
import { Linkedin_agent } from "./linkedin/run";
import type { TwitterAgentInput } from "./twitter/schema";
import { Twitter_agent } from "./twitter/run";

type LinkedinAgent = {
  name: "Linkedin_agent";
  description: string;
  run: (input: LinkedinAgentInput, client?: BrowserUse) => ReturnType<typeof Linkedin_agent>;
};

type TwitterAgent = {
  name: "Twitter_agent";
  description: string;
  run: (input: TwitterAgentInput, client?: BrowserUse) => ReturnType<typeof Twitter_agent>;
};

export type Agent = LinkedinAgent | TwitterAgent;

export const agents: { Linkedin_agent: LinkedinAgent; Twitter_agent: TwitterAgent } = {
  Linkedin_agent: {
    name: "Linkedin_agent",
    description: "Browser Use LinkedIn scraper that returns markdown (.md) output.",
    run: Linkedin_agent,
  },
  Twitter_agent: {
    name: "Twitter_agent",
    description: "Browser Use Twitter/X scraper that returns markdown (.md) output.",
    run: Twitter_agent,
  },
};

export { Linkedin_agent };
export { Twitter_agent };
export type { LinkedinAgentInput, LinkedinAgentStructuredOutput } from "./linkedin/schema";
export type { LinkedinAgentResult } from "./linkedin/protocol";
export type { TwitterAgentInput, TwitterAgentStructuredOutput } from "./twitter/schema";
export type { TwitterAgentResult } from "./twitter/protocol";
