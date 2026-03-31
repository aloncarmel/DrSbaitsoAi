import { NextRequest } from "next/server";
import { generateToken } from "@/lib/api-guard";

const ALLOWED_ORIGINS = [
  "https://drsbaitsogpt.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const originOk =
    origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
  const refererOk =
    referer && ALLOWED_ORIGINS.some((o) => referer.startsWith(o));

  if (!originOk && !refererOk) {
    return Response.json(
      { error: "Forbidden." },
      { status: 403 },
    );
  }

  const { token, expiresAt } = generateToken();
  return Response.json({ token, expiresAt });
}
