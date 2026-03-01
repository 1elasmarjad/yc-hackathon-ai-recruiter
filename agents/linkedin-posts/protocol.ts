import type { BrowserUse } from "browser-use-sdk";
import type Firecrawl from "@/lib/firecrawl/client";
import type { LinkedinPostsAgentInput, LinkedinPostsAgentResult } from "./schema";

export type LinkedinPostsAgentClients = {
  browserUseClient?: BrowserUse;
  firecrawlClient?: Firecrawl;
};

export type LinkedinPostsAgentRunner = (
  input: LinkedinPostsAgentInput,
  clients?: LinkedinPostsAgentClients,
) => Promise<LinkedinPostsAgentResult>;
