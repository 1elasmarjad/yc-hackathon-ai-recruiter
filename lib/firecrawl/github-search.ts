import Firecrawl from "@/lib/firecrawl/client";
import {
  GITHUB_SEARCH_LIMIT,
  normalizeGithubProfileUrl,
} from "@/agents/github/query";
import { z } from "zod";
import { getFirecrawlEnv } from "@/lib/firecrawl/env";
import { normalizeSearchResultUrls } from "@/lib/firecrawl/search-results";

const FullNameSchema = z.string().trim().min(1);

export async function findFirstGithubProfileByName(
  fullName: string,
  firecrawlClient?: Firecrawl,
): Promise<string | null> {
  const normalizedFullName = FullNameSchema.parse(fullName);
  const firecrawl = firecrawlClient ?? new Firecrawl({ apiKey: getFirecrawlEnv().FIRECRAWL_API_KEY });

  const searchQuery = `${normalizedFullName} Github`;
  const searchResult = await firecrawl.search(searchQuery, {
    limit: GITHUB_SEARCH_LIMIT,
  });

  const candidateUrls = normalizeSearchResultUrls(searchResult.web);

  for (const candidateUrl of candidateUrls) {
    const normalizedProfileUrl = normalizeGithubProfileUrl(candidateUrl);
    if (!normalizedProfileUrl) {
      continue;
    }

    return normalizedProfileUrl;
  }

  return null;
}
