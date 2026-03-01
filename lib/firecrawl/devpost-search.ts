import Firecrawl, { type Document, type SearchResultWeb } from "firecrawl";
import { z } from "zod";
import {
  DEVPOST_SEARCH_LIMIT,
  normalizeDevpostUserProfileUrl,
} from "@/agents/devpost/query";

const FirecrawlEnvSchema = z.object({
  FIRECRAWL_API_KEY: z.string().min(1),
});

const FullNameSchema = z.string().trim().min(1);

type SearchWebResult = SearchResultWeb | Document;

export class DevpostProfileNotFoundError extends Error {
  constructor(fullName: string) {
    super(`No valid Devpost user profile URL found for "${fullName}".`);
    this.name = "DevpostProfileNotFoundError";
  }
}

export function getFirecrawlEnv(): z.output<typeof FirecrawlEnvSchema> {
  const parsed = FirecrawlEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      "Missing FIRECRAWL_API_KEY in environment. Add it to your .env.local file.",
    );
  }

  return parsed.data;
}

function extractSearchResultUrl(result: SearchWebResult): string | null {
  const directUrl =
    "url" in result && typeof result.url === "string" ? result.url.trim() : "";
  if (directUrl) {
    return directUrl;
  }

  const metadataUrl =
    "metadata" in result && typeof result.metadata?.url === "string"
      ? result.metadata.url.trim()
      : "";

  return metadataUrl || null;
}

function normalizeWebResults(results: SearchWebResult[] | undefined): string[] {
  if (!results) {
    return [];
  }

  const urls: string[] = [];

  for (const result of results) {
    const extractedUrl = extractSearchResultUrl(result);
    if (!extractedUrl) {
      continue;
    }

    urls.push(extractedUrl);
  }

  return urls;
}

export async function findFirstDevpostProfileByName(fullName: string): Promise<string> {
  const normalizedFullName = FullNameSchema.parse(fullName);
  const firecrawl = new Firecrawl({ apiKey: getFirecrawlEnv().FIRECRAWL_API_KEY });

  const searchQuery = `${normalizedFullName} Devpost`;
  const searchResult = await firecrawl.search(searchQuery, {
    sources: ["web"],
    limit: DEVPOST_SEARCH_LIMIT,
  });

  const candidateUrls = normalizeWebResults(searchResult.web);

  for (const candidateUrl of candidateUrls) {
    const normalizedProfileUrl = normalizeDevpostUserProfileUrl(candidateUrl);
    if (!normalizedProfileUrl) {
      continue;
    }

    return normalizedProfileUrl;
  }

  throw new DevpostProfileNotFoundError(normalizedFullName);
}
