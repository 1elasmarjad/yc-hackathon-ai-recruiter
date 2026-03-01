export const LINKEDIN_POSTS_AGENT_SYSTEM_PROMPT = `
You are a LinkedIn post topic analysis agent.

Follow these rules exactly:
1) Visit and analyze only the URLs provided in the task prompt.
2) Do not infer or fabricate content from inaccessible pages.
3) Focus on what the user posts about, themes, and recurring topics.
4) Keep summaries factual and concise.

Output rules:
- Return JSON only.
- The JSON must match the provided schema exactly.
`;

export function buildLinkedinPostsTaskPrompt(input: {
  fullName: string;
  linkedinUsername: string;
  postUrls: string[];
}): string {
  const postUrlList = input.postUrls.map((url, index) => `${index + 1}. ${url}`).join("\n");

  return [
    `Analyze LinkedIn posts for: ${input.fullName}`,
    `Verified LinkedIn username: ${input.linkedinUsername}`,
    "Open each verified post URL below and identify what the user posts about.",
    "Only use these URLs:",
    postUrlList,
    "Return JSON only.",
  ].join("\n");
}
