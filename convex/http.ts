import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/vapi/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const messageType = body?.message?.type;

    if (messageType !== "end-of-call-report") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const transcript = body.message.artifact?.transcript;
    if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No transcript found in end-of-call-report." }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    await ctx.runAction(api.vapi.summarizeCallForStartupVibe, {
      transcript,
    });

    return new Response(JSON.stringify({ received: true, processed: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
