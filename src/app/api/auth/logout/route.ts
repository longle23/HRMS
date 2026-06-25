import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/server-auth";

function clearCookie(response: NextResponse, domain?: string) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    domain,
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  clearCookie(response);
  clearCookie(response, ".sotransgroup.vn");
  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearCookie(response);
  clearCookie(response, ".sotransgroup.vn");
  return response;
}
