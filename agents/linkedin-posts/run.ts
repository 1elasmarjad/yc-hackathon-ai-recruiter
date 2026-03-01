import { BrowserUse } from "browser-use-sdk";
import Firecrawl from "@/lib/firecrawl/client";
import { toLinkedinPostsMarkdown } from "./markdown";
import {
  buildLinkedinPostsTaskPrompt,
  LINKEDIN_POSTS_AGENT_SYSTEM_PROMPT,
} from "./prompt";
import {
  LINKEDIN_POSTS_ALLOWED_DOMAINS,
  LINKEDIN_POSTS_ANALYSIS_LIMIT,
  LINKEDIN_POSTS_DEFAULT_SEARCH_LIMIT,
} from "./query";
import {
  LinkedinPostsAgentInputSchema,
  LinkedinPostsAgentResultSchema,
  LinkedinPostsBrowserUseOutputSchema,
  LinkedinPostsVerificationSchema,
  type LinkedinPostsAgentResult,
} from "./schema";
import type { LinkedinPostsAgentRunner } from "./protocol";
import { firecrawlSearch, type FirecrawlSearchResultItem } from "./firecrawl";
import {
  canonicalizeUrl,
  dedupePreserveOrder,
  extractLinkedinUsernameFromProfileUrl,
  extractPostSlug,
  isLinkedInPostUrl,
} from "./url";

export class LinkedinProfileUsernameNotFoundError extends Error {
  constructor(profileUrl: string) {
    super(
      `Could not derive LinkedIn username from profile URL: ${profileUrl}. Expected a URL like https://www.linkedin.com/in/{username}/`,
    );
    this.name = "LinkedinProfileUsernameNotFoundError";
  }
}

function buildVerificationResult(input: {
  query: string;
  linkedinUsername: string;
  searchResults: FirecrawlSearchResultItem[];
}) {
  const resultByUrl = new Map<string, FirecrawlSearchResultItem>();

  for (const item of input.searchResults) {
    const canonicalUrl = canonicalizeUrl(item.url);
    if (canonicalUrl) {
      resultByUrl.set(canonicalUrl, item);
    }
  }

  const allUrls = dedupePreserveOrder(
    input.searchResults
      .map((item) => canonicalizeUrl(item.url))
      .filter((url): url is string => Boolean(url)),
  );

  const verifiedUrls: string[] = [];
  const rejected: LinkedinPostsAgentResult["rejected"] = [];

  for (const url of allUrls) {
    const searchItem = resultByUrl.get(url);
    const inspectedUrl = searchItem?.url ?? url;

    if (!isLinkedInPostUrl(inspectedUrl)) {
      rejected.push({
        url,
        slug: null,
        reason: "not_linkedin_post_url",
      });
      continue;
    }

    const slug = extractPostSlug(inspectedUrl);
    if (!slug) {
      rejected.push({
        url,
        slug: null,
        reason: "missing_post_slug",
      });
      continue;
    }

    if (slug.toLowerCase().startsWith(`${input.linkedinUsername.toLowerCase()}_`)) {
      verifiedUrls.push(url);
      continue;
    }

    rejected.push({
      url,
      slug,
      reason: "username_mismatch",
    });
  }

  return LinkedinPostsVerificationSchema.parse({
    query: input.query,
    derivedUsername: input.linkedinUsername,
    searchResultCount: input.searchResults.length,
    candidateUrlCount: allUrls.length,
    verifiedUrls,
    rejected,
  });
}

export const Linkedin_posts_agent: LinkedinPostsAgentRunner = async (
  input,
  clients = {},
) => {
  const parsedInput = LinkedinPostsAgentInputSchema.parse(input);
  const linkedinUsername = extractLinkedinUsernameFromProfileUrl(parsedInput.linkedinProfileUrl);

  if (!linkedinUsername) {
    throw new LinkedinProfileUsernameNotFoundError(parsedInput.linkedinProfileUrl);
  }

  const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
  let firecrawlClient = clients.firecrawlClient;

  if (!firecrawlClient) {
    if (!firecrawlApiKey) {
      throw new Error("Missing FIRECRAWL_API_KEY in environment. Add it to your .env.local file.");
    }

    firecrawlClient = new Firecrawl({ apiKey: firecrawlApiKey });
  }

  const browserUseClient = clients.browserUseClient ?? new BrowserUse();

  const query = `"${parsedInput.fullName}" site:linkedin.com/posts`;

  const search = await firecrawlSearch(firecrawlClient, {
    query,
    limit: parsedInput.maxSearchResults ?? LINKEDIN_POSTS_DEFAULT_SEARCH_LIMIT,
  });

  const verification = buildVerificationResult({
    query,
    linkedinUsername,
    searchResults: search.results,
  });

  const analyzedUrls = verification.verifiedUrls.slice(0, LINKEDIN_POSTS_ANALYSIS_LIMIT);

  if (analyzedUrls.length === 0) {
    const markdown = toLinkedinPostsMarkdown({
      fullName: parsedInput.fullName,
      linkedinProfileUrl: parsedInput.linkedinProfileUrl,
      verification,
      analyzedUrlCount: 0,
      analysis: null,
    });

    return LinkedinPostsAgentResultSchema.parse({
      ...verification,
      markdown,
      analyzedUrlCount: 0,
      liveUrl: null,
      sessionId: null,
    });
  }

  const taskResult = await browserUseClient.run(
    buildLinkedinPostsTaskPrompt({
      fullName: parsedInput.fullName,
      linkedinUsername,
      postUrls: analyzedUrls,
    }),
    {
      startUrl: analyzedUrls[0],
      allowedDomains: [...LINKEDIN_POSTS_ALLOWED_DOMAINS],
      schema: LinkedinPostsBrowserUseOutputSchema,
      systemPromptExtension: LINKEDIN_POSTS_AGENT_SYSTEM_PROMPT,
      ...(parsedInput.sessionId ? { sessionId: parsedInput.sessionId } : {}),
      ...(parsedInput.maxSteps ? { maxSteps: parsedInput.maxSteps } : {}),
    },
  );

  const analysis = LinkedinPostsBrowserUseOutputSchema.parse(taskResult.output);
  const session = await browserUseClient.sessions.get(taskResult.sessionId);

  const markdown = toLinkedinPostsMarkdown({
    fullName: parsedInput.fullName,
    linkedinProfileUrl: parsedInput.linkedinProfileUrl,
    verification,
    analyzedUrlCount: analyzedUrls.length,
    analysis,
  });

  return LinkedinPostsAgentResultSchema.parse({
    ...verification,
    markdown,
    analyzedUrlCount: analyzedUrls.length,
    liveUrl: session.liveUrl ?? null,
    sessionId: taskResult.sessionId,
  });
};
