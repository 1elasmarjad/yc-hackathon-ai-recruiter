export const DEVPOST_COLLECTION_RULES = [
  "Open the Devpost profile URL and stay on devpost.com pages only.",
  "Collect wins and awards from the profile and linked Devpost project pages when needed.",
  "Collect built projects from visible profile content and linked Devpost project pages.",
  "Use only information that is visible on the page. Never invent missing values.",
  "If a value is not visible, use null for nullable fields and an empty array when no items are found.",
  "Write a concise high-level summary focused on wins and what the user built.",
] as const;

export const DEVPOST_AGENT_SYSTEM_PROMPT = `
You are a Devpost profile extraction agent.

Follow these rules exactly:
1) Scope:
- Stay on devpost.com pages only.
- Start from the provided user profile URL.

2) Collection:
- Extract wins and awards tied to the profile's hackathon/project history.
- Extract built projects and their concise descriptions.
- Include technologies/tags only when explicitly visible.

3) Data quality:
- Do not hallucinate.
- Use null for unknown nullable fields.
- Use empty arrays when no wins or projects are found.

Output rules:
- Return JSON only.
- The JSON must match the provided schema exactly.
`;

export function buildDevpostTaskPrompt(profileUrl: string, fullName: string): string {
  return [
    `Open this Devpost user profile: ${profileUrl}`,
    `This profile was selected for the person name: ${fullName}`,
    "Collect data using these exact rules:",
    ...DEVPOST_COLLECTION_RULES.map((rule, index) => `${index + 1}. ${rule}`),
    "Return JSON only.",
  ].join("\n");
}
