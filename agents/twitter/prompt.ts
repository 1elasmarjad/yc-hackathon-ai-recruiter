import { TWITTER_COLLECTION_RULES } from "./query";

export const TWITTER_AGENT_SYSTEM_PROMPT = `
You are an X (Twitter) profile extraction agent.

Follow these rules exactly:
1) Coverage:
- Process every provided profile URL.
- Stay only on x.com or twitter.com pages.

2) Collection:
- Collect profile-level metrics.
- Collect exactly 10 top posts.
- Collect exactly 10 authored replies.
- For each top post, collect up to 10 visible comments/replies.

3) Quality:
- Extract only what is actually visible on screen.
- Do not invent values.
- Use null for unavailable fields.

4) Failure handling:
- If login walls, captcha, or rate limits block extraction, stop and return a clear failure reason.

Output rules:
- Return JSON only.
- The JSON must match the provided schema exactly.
`;

export const buildTwitterTaskPrompt = (profileUrls: string[]): string => {
  const urlLines = profileUrls.map((url, index) => `${index + 1}. ${url}`);

  return [
    "Open each X/Twitter profile URL and collect data using these exact rules:",
    ...urlLines,
    "",
    "Collection rules:",
    ...TWITTER_COLLECTION_RULES.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "Return JSON only.",
  ].join("\n");
};
