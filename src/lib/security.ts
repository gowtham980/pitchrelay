import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/** Simple sliding-window rate limiter (per process / instance). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientKey(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}

/**
 * Returns a 429 response when over limit, else null.
 * Default: 60 requests / minute / key for a route class.
 */
export function rateLimit(
  req: Request,
  opts: { name: string; limit?: number; windowMs?: number } = { name: "default" },
): NextResponse | null {
  const limit = opts.limit ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const id = `${opts.name}:${clientKey(req)}`;
  const now = Date.now();
  let b = buckets.get(id);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(id, b);
  }
  b.count += 1;
  if (b.count > limit) {
    const retry = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterSec: retry },
      {
        status: 429,
        headers: { "Retry-After": String(retry) },
      },
    );
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Write guard for mutating demo endpoints.
 *
 * - If DEMO_WRITE_KEY is unset → open (local hackathon default).
 * - If set → allow when:
 *   1) `x-demo-key` header matches, or
 *   2) browser same-origin fetch (`Sec-Fetch-Site: same-origin`).
 *
 * External scripts must send the key. UI keeps working without exposing
 * the key in client bundles.
 */
export function assertWriteAllowed(req: Request): NextResponse | null {
  const expected = process.env.DEMO_WRITE_KEY?.trim();
  if (!expected) return null;

  const provided = req.headers.get("x-demo-key")?.trim() ?? "";
  if (provided && safeEqual(provided, expected)) return null;

  const site = (req.headers.get("sec-fetch-site") ?? "").toLowerCase();
  if (site === "same-origin") return null;

  return NextResponse.json(
    {
      error: "Unauthorized write",
      message:
        "Mutating endpoints require header x-demo-key when DEMO_WRITE_KEY is configured (or a same-origin browser request).",
    },
    { status: 401 },
  );
}
