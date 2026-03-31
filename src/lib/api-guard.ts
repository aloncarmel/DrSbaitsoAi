import { NextRequest } from "next/server";
import crypto from "crypto";

const TOKEN_SECRET =
  process.env.API_TOKEN_SECRET ?? "dr-sbaitso-default-secret-change-me";
const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_INPUT_LENGTH = 1000;

const ALLOWED_ORIGINS = [
  "https://drsbaitsogpt.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

// --------------- Rate limiter (in-memory, per-IP) ---------------

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (bucket.count >= maxPerMinute) {
    return false;
  }

  bucket.count += 1;
  return true;
}

// Periodically clean up stale buckets
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now > bucket.resetAt) {
      rateBuckets.delete(key);
    }
  }
}, 60_000);

// --------------- Token helpers ---------------

export function generateToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${expiresAt}`;
  const hmac = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("hex");
  return { token: `${payload}.${hmac}`, expiresAt };
}

function verifyToken(token: string): boolean {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expiresAt = parseInt(payload, 10);

  if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

  const expected = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex"),
  );
}

// --------------- Main guard ---------------

type GuardOptions = {
  maxPerMinute?: number;
  maxBodyLength?: number;
};

export function guardRequest(
  request: NextRequest,
  opts: GuardOptions = {},
): Response | null {
  const { maxPerMinute = 30, maxBodyLength = MAX_INPUT_LENGTH } = opts;

  // 1. Origin check
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const originOk =
    origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
  const refererOk =
    referer && ALLOWED_ORIGINS.some((o) => referer.startsWith(o));

  if (!originOk && !refererOk) {
    return Response.json(
      { error: "Forbidden: invalid origin." },
      { status: 403 },
    );
  }

  // 2. Token check
  const token = request.headers.get("x-session-token");
  if (!token || !verifyToken(token)) {
    return Response.json(
      { error: "Forbidden: invalid or expired token." },
      { status: 403 },
    );
  }

  // 3. Rate limit
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!rateLimit(ip, maxPerMinute)) {
    return Response.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 },
    );
  }

  return null; // All checks passed
}

export { MAX_INPUT_LENGTH };
