import { NextRequest } from "next/server";
import { guardRequest, MAX_INPUT_LENGTH } from "@/lib/api-guard";

const DEFAULT_VOICE_ID = "QpGxHEIq2ztI4RrUvjwY";

export async function POST(request: NextRequest) {
  const blocked = guardRequest(request, { maxPerMinute: 20 });
  if (blocked) return blocked;

  const apiKey = process.env.ELEVENLABS_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Missing ELEVENLABS_KEY." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    input?: string;
  };

  const input = body.input?.trim()?.slice(0, MAX_INPUT_LENGTH);

  if (!input) {
    return Response.json({ error: "Missing input." }, { status: 400 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;

  const ttsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: input,
        model_id: "eleven_flash_v2",
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.15,
          style: 0.0,
          use_speaker_boost: false,
          speed: 0.7,
        },
        output_format: "mp3_44100_128",
      }),
    },
  );

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text();
    return Response.json(
      { error: "ElevenLabs TTS request failed.", details: errorText },
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
