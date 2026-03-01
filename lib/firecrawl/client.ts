import { z } from "zod";

const FirecrawlClientOptionsSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.url().optional(),
});

const FirecrawlSearchOptionsSchema = z.object({
  sources: z.array(z.literal("web")).optional(),
  limit: z.number().int().min(1).optional(),
});

const FirecrawlSearchInputSchema = z.object({
  query: z.string().trim().min(1),
  sources: z.array(z.literal("web")).optional(),
  limit: z.number().int().min(1).optional(),
});

const FirecrawlResultMetadataSchema = z
  .object({
    url: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .passthrough();

const FirecrawlSearchResultWebSchema = z
  .object({
    url: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    metadata: FirecrawlResultMetadataSchema.optional(),
  })
  .passthrough();

const FirecrawlDocumentSchema = z
  .object({
    metadata: FirecrawlResultMetadataSchema.optional(),
  })
  .passthrough();

const FirecrawlSearchResultItemSchema = z.union([
  FirecrawlSearchResultWebSchema,
  FirecrawlDocumentSchema,
]);

const FirecrawlSearchResponseSchema = z.union([
  z.object({
    web: z.array(FirecrawlSearchResultItemSchema),
  }),
  z.object({
    data: z.array(FirecrawlSearchResultItemSchema),
  }),
]);

export type SearchResultWeb = z.output<typeof FirecrawlSearchResultWebSchema>;
export type Document = z.output<typeof FirecrawlDocumentSchema>;

export type FirecrawlSearchOptions = z.input<typeof FirecrawlSearchOptionsSchema>;

type FirecrawlSearchResponse = {
  web: Array<SearchResultWeb | Document>;
};

export default class Firecrawl {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: z.input<typeof FirecrawlClientOptionsSchema>) {
    const parsedOptions = FirecrawlClientOptionsSchema.parse(options);

    this.apiKey = parsedOptions.apiKey;
    this.baseUrl = parsedOptions.baseUrl ?? "https://api.firecrawl.dev/v1";
  }

  async search(query: string, options: FirecrawlSearchOptions = {}): Promise<FirecrawlSearchResponse> {
    const parsedInput = FirecrawlSearchInputSchema.parse({
      query,
      ...FirecrawlSearchOptionsSchema.parse(options),
    });

    const response = await fetch(`${this.baseUrl}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedInput),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl search failed with status ${response.status}.`);
    }

    const json: unknown = await response.json();
    const parsedResponse = FirecrawlSearchResponseSchema.safeParse(json);

    if (!parsedResponse.success) {
      throw new Error("Firecrawl search returned an unexpected response shape.");
    }

    if ("web" in parsedResponse.data) {
      return {
        web: parsedResponse.data.web,
      };
    }

    return {
      web: parsedResponse.data.data,
    };
  }
}
