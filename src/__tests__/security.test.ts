import { describe, expect, it } from "vitest";
import { assertWriteAllowed, rateLimit } from "@/lib/security";

function req(
  url = "http://localhost/api/incidents",
  headers: Record<string, string> = {},
): Request {
  return new Request(url, { method: "POST", headers });
}

describe("assertWriteAllowed", () => {
  it("allows all writes when DEMO_WRITE_KEY is unset", () => {
    const prev = process.env.DEMO_WRITE_KEY;
    delete process.env.DEMO_WRITE_KEY;
    expect(assertWriteAllowed(req())).toBeNull();
    if (prev !== undefined) process.env.DEMO_WRITE_KEY = prev;
  });

  it("rejects external callers without key when DEMO_WRITE_KEY is set", () => {
    const prev = process.env.DEMO_WRITE_KEY;
    process.env.DEMO_WRITE_KEY = "secret-demo-key";
    const denied = assertWriteAllowed(req());
    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(401);
    if (prev === undefined) delete process.env.DEMO_WRITE_KEY;
    else process.env.DEMO_WRITE_KEY = prev;
  });

  it("allows matching x-demo-key", () => {
    const prev = process.env.DEMO_WRITE_KEY;
    process.env.DEMO_WRITE_KEY = "secret-demo-key";
    const ok = assertWriteAllowed(req("http://localhost/api/x", { "x-demo-key": "secret-demo-key" }));
    expect(ok).toBeNull();
    if (prev === undefined) delete process.env.DEMO_WRITE_KEY;
    else process.env.DEMO_WRITE_KEY = prev;
  });

  it("allows same-origin browser fetches", () => {
    const prev = process.env.DEMO_WRITE_KEY;
    process.env.DEMO_WRITE_KEY = "secret-demo-key";
    const ok = assertWriteAllowed(
      req("http://localhost/api/x", { "sec-fetch-site": "same-origin" }),
    );
    expect(ok).toBeNull();
    if (prev === undefined) delete process.env.DEMO_WRITE_KEY;
    else process.env.DEMO_WRITE_KEY = prev;
  });
});

describe("rateLimit", () => {
  it("returns 429 after exceeding limit", () => {
    const headers = { "x-forwarded-for": "203.0.113.50" };
    const name = `test-${Date.now()}`;
    let blocked: Response | null = null;
    for (let i = 0; i < 6; i++) {
      blocked = rateLimit(req("http://localhost/api/assist", headers), {
        name,
        limit: 5,
        windowMs: 60_000,
      });
    }
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });
});
