import { LinkedinAgentStructuredOutput } from "./schema";

export const toLinkedinMarkdown = (data: LinkedinAgentStructuredOutput): string => {
    const lines: string[] = [];

    lines.push(`# LinkedIn Profile: ${data.name || "Unknown"}`);
    lines.push(`URL: ${data.profileUrl}`);

    if (data.headline) lines.push(`**Headline:** ${data.headline}`);
    if (data.location) lines.push(`**Location:** ${data.location}`);
    if (data.about) lines.push(`\n## About\n${data.about}`);

    if (data.activity && data.activity.length > 0) {
        lines.push(`\n## Activity`);
        data.activity.forEach(a => lines.push(`- ${a}`));
    }

    if (data.projects && data.projects.length > 0) {
        lines.push(`\n## Projects`);
        data.projects.forEach(p => {
            lines.push(`### ${p.name}`);
            if (p.description) lines.push(p.description);
            if (p.url) lines.push(`[Link](${p.url})`);
        });
    }

    if (data.interests) {
        lines.push(`\n## Interests Summary`);
        lines.push(data.interests);
    }

    if (data.images && data.images.length > 0) {
        lines.push(`\n## Images`);
        data.images.forEach(img => lines.push(`![](${img})`));
    }

    return lines.join("\n");
};
