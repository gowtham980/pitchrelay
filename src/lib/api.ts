import { NextResponse } from "next/server";
import type { z } from "zod";

/** JSON error response helper for API routes. */
export function jsonError(
  error: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error, ...extra }, { status });
}

/** JSON success response helper. */
export function jsonOk<T>(data: T, init?: { status?: number }): NextResponse {
  return NextResponse.json(data, init);
}

/**
 * Parse + Zod-validate a JSON request body.
 * Returns either `{ data }` (schema output type) or a ready-to-return `{ response }`.
 */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<
  | { data: z.output<S>; response?: undefined }
  | { data?: undefined; response: NextResponse }
> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { response: jsonError("Invalid JSON body", 400) };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      response: NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      ),
    };
  }
  return { data: parsed.data };
}

/** Wrap an async route body with consistent error logging + JSON 500. */
export async function handleRoute(
  label: string,
  fallbackError: string,
  fn: () => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    console.error(label, err);
    return jsonError(fallbackError, 500);
  }
}
