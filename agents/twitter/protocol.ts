import type { BrowserUse } from "browser-use-sdk";
import type { TwitterAgentInput } from "./schema";

export type TwitterAgentResult = string;

export type TwitterAgentRunner = (
  input: TwitterAgentInput,
  client?: BrowserUse,
) => Promise<TwitterAgentResult>;
