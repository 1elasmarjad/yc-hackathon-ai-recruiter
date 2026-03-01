import { z } from "zod";

const FirecrawlEnvSchema = z.object({
  FIRECRAWL_API_KEY: z.string().min(1),
});

export function getFirecrawlEnv(): z.output<typeof FirecrawlEnvSchema> {
  const parsed = FirecrawlEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(
      "Missing FIRECRAWL_API_KEY in environment. Add it to your .env.local file.",
    );
  }

  return parsed.data;
}
