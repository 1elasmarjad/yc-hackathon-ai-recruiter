import { BrowserUse } from "browser-use-sdk";

async function main() {
    const apiKey = process.env.BROWSER_USE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing BROWSER_USE_API_KEY");
    }

    const client = new BrowserUse({ apiKey });

    const name = "linkedin-agent-profile";
    const url = "https://www.linkedin.com/login";
    const email = "moonboontune2@gmail.com";
    const pass = "Browseruser1!";

    console.log(`Creating profile: ${name}...`);
    const profile = await client.profiles.create({ name });
    console.log(`Profile created: ${profile.id}`);

    console.log(`Creating session with profile: ${profile.id}...`);
    const session = await client.sessions.create({ profileId: profile.id });
    console.log(`Session created: ${session.id}`);

    console.log(`Live URL: ${session.liveUrl}`);

    console.log(`Running login task...`);
    const taskPrompt = `Navigate to ${url}. Type email: ${email} and type password: ${pass}. Submit the form, complete any captchas manually via Live URL if needed, then wait and confirm login success.`;

    try {
        const result = await client.run(taskPrompt, {
            sessionId: session.id,
        });
        console.log(`Login task finished. Outcome:`, result.output);
    } finally {
        await client.sessions.stop(session.id);
        console.log(`Session stopped. Put this in your .env:`);
        console.log(`LINKEDIN_PROFILE_ID="${profile.id}"`);
    }
}

main().catch(console.error);
