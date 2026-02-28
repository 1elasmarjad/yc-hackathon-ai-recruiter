import type { BrowserUse } from "browser-use-sdk";
import type { LinkedinAgentInput } from "./schema";

export type LinkedinAgentResult = string;

export type LinkedinAgentRunner = (
  input: LinkedinAgentInput,
  client?: BrowserUse,
) => Promise<LinkedinAgentResult>;
