import { BrowserUse } from "browser-use-sdk";
import { toLinkedinMarkdown } from "./markdown";
import { buildLinkedinTaskPrompt, LINKEDIN_AGENT_SYSTEM_PROMPT } from "./prompt";
import { LinkedinAgentInputSchema, LinkedinAgentStructuredOutputSchema, type LinkedinAgentInput } from "./schema";

export const Linkedin_agent = async (
    input: LinkedinAgentInput,
    client = new BrowserUse(),
) => {
    const parsedInput = LinkedinAgentInputSchema.parse(input);

    const taskResult = await client.run(
        buildLinkedinTaskPrompt(parsedInput.linkedinUrl),
        {
            schema: LinkedinAgentStructuredOutputSchema,
            systemPromptExtension: LINKEDIN_AGENT_SYSTEM_PROMPT,
            flashMode: true,
            ...(parsedInput.sessionId ? { sessionId: parsedInput.sessionId } : {}),
            ...(parsedInput.maxSteps ? { maxSteps: parsedInput.maxSteps } : {}),
        },
    );

    const structured = LinkedinAgentStructuredOutputSchema.parse(taskResult.output);
    return toLinkedinMarkdown(structured);
};
