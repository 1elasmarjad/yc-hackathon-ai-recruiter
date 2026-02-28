import { BrowserUse } from "browser-use-sdk";

export async function createAndLoginProfile(name: string, url: string, email: string, pass: string) {
    const apiKey = process.env.BROWSER_USE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing BROWSER_USE_API_KEY");
    }

    const client = new BrowserUse({ apiKey });

    console.log(`Creating profile: ${name}...`);
    const profile = await client.profiles.create({ name });
    console.log(`Profile created: ${profile.id}`);

    console.log(`Creating session with profile: ${profile.id}...`);
    const session = await client.sessions.create({ profileId: profile.id });
    console.log(`Session created: ${session.id}`);

    console.log(`Live URL: ${session.liveUrl}`);

    console.log(`Running login task...`);
    const taskPrompt = `Navigate to ${url} and log in.
1. Enter email: ${email}
2. Enter password: ${pass}
3. Submit the login form.
4. Verify you are logged in.`;

    const result = await client.run(taskPrompt, {
        sessionId: session.id,
        maxSteps: 30,
    });

    console.log(`Login task finished. Outcome:`);
    console.log(result.output);

    await client.sessions.stop(session.id);
    console.log(`Session stopped. You can now use PROFILE_ID: ${profile.id}`);
    return profile.id;
}
