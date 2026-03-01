import type { BrowserUse } from "browser-use-sdk";
import type { DevpostAgentInput } from "./devpost/schema";
import { Devpost_agent } from "./devpost/run";
import type { GithubAgentInput } from "./github/schema";
import { Github_agent } from "./github/run";
import { Linkedin_posts_agent } from "./linkedin-posts/run";
import type { TwitterAgentInput } from "./twitter/schema";
import { Twitter_agent } from "./twitter/run";
import type { LinkedinAgentInput } from "./linkedin/schema";
import { Linkedin_agent } from "./linkedin/run";

type DevpostAgent = {
  name: "Devpost_agent";
  description: string;
  run: (input: DevpostAgentInput, client?: BrowserUse) => ReturnType<typeof Devpost_agent>;
};

type LinkedinPostsAgent = {
  name: "Linkedin_posts_agent";
  description: string;
  run: typeof Linkedin_posts_agent;
};

type GithubAgent = {
  name: "Github_agent";
  description: string;
  run: (input: GithubAgentInput, client?: BrowserUse) => ReturnType<typeof Github_agent>;
};

type TwitterAgent = {
  name: "Twitter_agent";
  description: string;
  run: (input: TwitterAgentInput, client?: BrowserUse) => ReturnType<typeof Twitter_agent>;
};

type LinkedinAgent = {
  name: "Linkedin_agent";
  description: string;
  run: (input: LinkedinAgentInput, client?: BrowserUse) => ReturnType<typeof Linkedin_agent>;
};

export type Agent = DevpostAgent | LinkedinPostsAgent | GithubAgent | TwitterAgent | LinkedinAgent;

export const agents: {
  Devpost_agent: DevpostAgent;
  Linkedin_posts_agent: LinkedinPostsAgent;
  Github_agent: GithubAgent;
  Twitter_agent: TwitterAgent;
  Linkedin_agent: LinkedinAgent;
} = {
  Devpost_agent: {
    name: "Devpost_agent",
    description:
      "Firecrawl + Browser Use Devpost scraper that returns high-level wins and built projects in markdown.",
    run: Devpost_agent,
  },
  Linkedin_posts_agent: {
    name: "Linkedin_posts_agent",
    description:
      "Firecrawl + Browser Use LinkedIn posts scraper that returns markdown summary and diagnostics.",
    run: Linkedin_posts_agent,
  },
  Github_agent: {
    name: "Github_agent",
    description:
      "Browser Use GitHub profile scraper that returns contributions summary and pinned repositories with stars in markdown.",
    run: Github_agent,
  },
  Twitter_agent: {
    name: "Twitter_agent",
    description: "Browser Use Twitter/X scraper that returns markdown (.md) output.",
    run: Twitter_agent,
  },
  Linkedin_agent: {
    name: "Linkedin_agent",
    description: "Browser Use LinkedIn profile scraper that returns markdown output.",
    run: Linkedin_agent,
  },
};

export { Devpost_agent };
export { Github_agent };
export { Linkedin_posts_agent };
export { Twitter_agent };
export { Linkedin_agent };
export type { DevpostAgentInput, DevpostAgentStructuredOutput } from "./devpost/schema";
export type { DevpostAgentResult } from "./devpost/protocol";
export type { GithubAgentInput, GithubAgentStructuredOutput } from "./github/schema";
export type { GithubAgentResult } from "./github/protocol";
export type {
  LinkedinPostsAgentInput,
  LinkedinPostsAgentResult,
  LinkedinPostsVerification,
} from "./linkedin-posts/schema";
export type { LinkedinPostsAgentClients, LinkedinPostsAgentRunner } from "./linkedin-posts/protocol";
export type { TwitterAgentInput, TwitterAgentStructuredOutput } from "./twitter/schema";
export type { TwitterAgentResult } from "./twitter/protocol";
export type { LinkedinAgentInput, LinkedinAgentStructuredOutput } from "./linkedin/schema";
