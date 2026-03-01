import type { Document, SearchResultWeb } from "@/lib/firecrawl/client";

export type SearchWebResult = SearchResultWeb | Document;

export function extractSearchResultUrl(result: SearchWebResult): string | null {
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

export function normalizeSearchResultUrls(results: SearchWebResult[] | undefined): string[] {
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
