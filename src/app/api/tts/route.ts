import { NextRequest } from "next/server";
import { transformToSbaitsoSpeech } from "@/lib/audio/sbaitso-voice";
import { guardRequest, MAX_INPUT_LENGTH } from "@/lib/api-guard";

const DEFAULT_VOICE = "onyx";
const DEFAULT_MODEL = "gpt-4o-mini-tts";

export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, { maxPerMinute: 20 });
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
  };

  const input = body.input?.trim()?.slice(0, MAX_INPUT_LENGTH);

  if (!input) {
    return Response.json({ error: "Missing input." }, { status: 400 });
  }

  const transformedInput = transformToSbaitsoSpeech(input);

  const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL ?? DEFAULT_MODEL,
      voice: body.voice ?? process.env.OPENAI_TTS_VOICE ?? DEFAULT_VOICE,
      input: transformedInput,
      instructions:
        "Speak like an 1980s hardware speech synthesizer. Keep emotional expression at zero. Use a measured mechanical pace. Treat the line as a sequence of separate words, not as a naturally spoken sentence. Keep articulation clipped, rigid, and slightly artificial. Use nearly flat pitch across the whole line, with almost no prosody. Do not smooth words together. Do not round sentence endings. Keep consonants hard and boundaries obvious. Let the tone stay low, synthetic, and machine-like. For lines ending in a question mark, allow only a tiny upward pitch lift on the final word.",
      response_format: "mp3",
      speed: Number(process.env.OPENAI_TTS_SPEED ?? "1.04"),
    }),
  });

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text();

    return Response.json(
      {
        error: "OpenAI TTS request failed.",
        details: errorText,
      },
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
