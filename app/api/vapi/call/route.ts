import { NextResponse } from "next/server";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const VAPI_ASSISTANT_ID = "6cb617d8-80d9-4c29-869e-980282763ac0";
const VAPI_PHONE_NUMBER_ID = "9857a98e-62cf-448b-a0fb-75ce6212f723";
const HARDCODED_CUSTOMER_NUMBER = "+12899521155";

const SendCallRequestSchema = z.object({
  candidateId: z.string().min(1),
});

const VapiCallResponseSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = SendCallRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const vapiApiKey = process.env.VAPI_API_KEY;
  if (!vapiApiKey) {
    return NextResponse.json(
      { error: "Missing VAPI_API_KEY in environment." },
      { status: 500 },
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_CONVEX_URL in environment." },
      { status: 500 },
    );
  }

  const response = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vapiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistantId: VAPI_ASSISTANT_ID,
      phoneNumberId: VAPI_PHONE_NUMBER_ID,
      customer: { number: HARDCODED_CUSTOMER_NUMBER },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return NextResponse.json(
      { error: `VAPI API error (${response.status}): ${errorBody}` },
      { status: 502 },
    );
  }

  const vapiData = await response.json();
  const vapiParsed = VapiCallResponseSchema.safeParse(vapiData);

  if (!vapiParsed.success) {
    return NextResponse.json(
      { error: "Unexpected response from VAPI.", raw: vapiData },
      { status: 502 },
    );
  }

  const convex = new ConvexHttpClient(convexUrl);
  await convex.mutation(api.workflows.setCandidateVapiCallId, {
    candidateId: parsed.data.candidateId as Id<"candidates">,
    vapiCallId: vapiParsed.data.id,
  });

  return NextResponse.json({
    callId: vapiParsed.data.id,
    status: vapiParsed.data.status ?? "queued",
    candidateId: parsed.data.candidateId,
  });
}
