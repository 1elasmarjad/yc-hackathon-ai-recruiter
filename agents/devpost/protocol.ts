import type { BrowserUse } from "browser-use-sdk";
import type { DevpostAgentInput } from "./schema";

export type DevpostAgentResult = {
  markdown: string;
  liveUrl: string | null;
  sessionId: string;
};

export type DevpostAgentRunner = (
  input: DevpostAgentInput,
  client?: BrowserUse,
) => Promise<DevpostAgentResult>;
