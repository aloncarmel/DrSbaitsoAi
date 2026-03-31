import { NextRequest } from "next/server";
import { personaConfig } from "@/lib/persona/config";
import { guardRequest, MAX_INPUT_LENGTH } from "@/lib/api-guard";

const DEFAULT_MODEL = "gpt-5.4-mini";

type RespondRequest = {
  input?: string;
  mode?: string;
  name?: string | null;
  questionsRemaining?: number;
  history?: { role: string; content: string }[];
};

export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, { maxPerMinute: 30 });
  if (blocked) return blocked;

  const apiKey = process.env.OPENAI_KEY ?? process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Missing OPENAI_KEY or OPENAI_API_KEY." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as RespondRequest;
  const input = body.input?.trim()?.slice(0, MAX_INPUT_LENGTH);

  if (!input) {
    return Response.json({ error: "Missing input." }, { status: 400 });
  }

  const instructions = [
    personaConfig.instructions,
    `CURRENT MODE: ${body.mode ?? "STRICT"}`,
    `USER NAME: ${body.name ?? "UNKNOWN"}`,
    `QUESTIONS REMAINING THIS SESSION: ${body.questionsRemaining ?? personaConfig.maxQuestionsPerSession}`,
  ].join("\n");

  const conversationInput: { role: string; content: string }[] = [];
  if (body.history?.length) {
    for (const msg of body.history) {
      conversationInput.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
  }
  conversationInput.push({ role: "user", content: input });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      instructions,
      input: conversationInput,
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
