import type { BrowserUse } from "browser-use-sdk";
import type { GithubAgentInput } from "./schema";

export type GithubAgentResult = string;

export type GithubAgentRunner = (
  input: GithubAgentInput,
  client?: BrowserUse,
) => Promise<GithubAgentResult>;
