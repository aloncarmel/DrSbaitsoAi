import { NextRequest } from "next/server";
import { personaConfig } from "@/lib/persona/config";

const DEFAULT_MODEL = "gpt-5.4";

type RespondRequest = {
  input?: string;
  mode?: string;
  name?: string | null;
  questionsRemaining?: number;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_KEY ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Missing OPENAI_KEY or OPENAI_API_KEY." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as RespondRequest;
  const input = body.input?.trim();

  if (!input) {
    return Response.json({ error: "Missing input." }, { status: 400 });
  }

  const instructions = [
    personaConfig.instructions,
    `CURRENT MODE: ${body.mode ?? "STRICT"}`,
    `USER NAME: ${body.name ?? "UNKNOWN"}`,
    `QUESTIONS REMAINING THIS SESSION: ${body.questionsRemaining ?? personaConfig.maxQuestionsPerSession}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      instructions,
      input,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    return Response.json(
      { error: "OpenAI response request failed.", details: errorText },
      { status: response.status },
    );
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
