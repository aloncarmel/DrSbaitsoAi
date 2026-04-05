import { NextRequest } from "next/server";
import { guardRequest } from "@/lib/api-guard";

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

  const body = (await request.json()) as {
    input?: string;
    voice?: string;
    speed?: number;
    instructions?: string;
  };

  const input = body.input?.trim()?.slice(0, 500);

  if (!input) {
    return Response.json({ error: "Missing input." }, { status: 400 });
  }

  const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: body.voice ?? "onyx",
      input,
      instructions: body.instructions ?? "",
      response_format: "mp3",
      speed: body.speed ?? 1.04,
    }),
  });

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text();
    return Response.json(
      { error: "OpenAI TTS request failed.", details: errorText },
      { status: ttsResponse.status },
    );
  }

  const audioBuffer = await ttsResponse.arrayBuffer();

  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
