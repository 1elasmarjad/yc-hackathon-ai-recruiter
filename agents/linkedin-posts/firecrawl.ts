import type Firecrawl from "@/lib/firecrawl/client";
import { type Document, type SearchResultWeb } from "@/lib/firecrawl/client";

export type FirecrawlSearchResultItem = {
  url: string;
  title: string | null;
  description: string | null;
};

export type FirecrawlSearchResult = {
  results: FirecrawlSearchResultItem[];
};

type SearchWebResult = SearchResultWeb | Document;

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

function normalizeSearchResultItem(result: SearchWebResult): FirecrawlSearchResultItem | null {
  const metadata =
    "metadata" in result && typeof result.metadata === "object" && result.metadata !== null
      ? result.metadata
      : null;

  const url = toOptionalString(
    "url" in result ? result.url : metadata?.url,
  );

  if (!url) {
    return null;
  }

  const title = toOptionalString("title" in result ? result.title : metadata?.title);
  const description = toOptionalString(
    "description" in result ? result.description : metadata?.description,
  );

  return {
    url,
    title,
    description,
  };
}

export async function firecrawlSearch(
  firecrawl: Firecrawl,
  input: { query: string; limit: number },
): Promise<FirecrawlSearchResult> {
  const searchResponse = await firecrawl.search(input.query, {
    sources: ["web"],
    limit: input.limit,
  });

  const results: FirecrawlSearchResultItem[] = [];

  for (const result of searchResponse.web ?? []) {
    const normalizedResult = normalizeSearchResultItem(result);

    if (!normalizedResult) {
      continue;
    }

    results.push(normalizedResult);
  }

  return { results };
}
