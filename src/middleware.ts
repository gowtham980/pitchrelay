import { NextResponse } from "next/server";
import { CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "@/lib/security-headers";

export function middleware() {
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(k, v);
  }
  res.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
