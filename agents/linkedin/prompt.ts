import { LINKEDIN_COLLECTION_RULES } from "./query";

export const LINKEDIN_AGENT_SYSTEM_PROMPT = `
You are a LinkedIn profile extraction agent.

Follow these rules exactly:
1) Posts:
- Collect only Featured posts, or posts currently visible on screen.
- Never click to load more posts.

2) Experience:
- Scroll to Experience.
- Collect every Experience item currently visible only.

3) Projects:
- Scroll to Projects.
- Collect every Project item currently visible only.
- If there are no projects, end the task immediately.

Output rules:
- Return JSON only.
- The JSON must match the provided schema exactly.
`;

export const buildLinkedinTaskPrompt = (profileUrl: string): string => {
  return [
    `Open this LinkedIn profile: ${profileUrl}`,
    "Collect data using these exact rules:",
    ...LINKEDIN_COLLECTION_RULES.map((rule, index) => `${index + 1}. ${rule}`),
    "Return JSON only.",
  ].join("\n");
};
