import { cookies } from "next/headers";
import { jwtVerify, type JWTPayload } from "jose";
import type { AccountUser } from "@/types/hr";

const SESSION_COOKIE_NAME = "hrms_session_user";
const RECRUIT_AUDIENCE = "ai-recruit";
const RECRUIT_SCOPE = "recruit";

type HandoffPayload = JWTPayload & {
  email?: unknown;
  name?: unknown;
  role?: unknown;
  permissions?: unknown;
  scope?: unknown;
};

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

function mapPayloadToAccountUser(payload: HandoffPayload): AccountUser | null {
  const email = normalize(payload.email);
  const subject = normalize(payload.sub);
  const name = normalize(payload.name);
  const username = email || subject;

  if (!username) return null;

  return {
    id: subject || email,
    username,
    fullName: name || email || subject,
    email,
  };
}

function parseDevelopmentJsonCookie(value: string): AccountUser | null {
  if (process.env.NODE_ENV === "production") return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<AccountUser>;
    const username = normalize(parsed.username);
    if (!username) return null;

    return {
      id: normalize(parsed.id),
      username,
      fullName: normalize(parsed.fullName),
      email: normalize(parsed.email),
    };
  } catch {
    return null;
  }
}

export async function getVerifiedSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = getJwtSecret();
  if (!secret) return parseDevelopmentJsonCookie(token);

  try {
    const { payload } = await jwtVerify<HandoffPayload>(token, secret, {
      audience: RECRUIT_AUDIENCE,
    });

    if (payload.scope !== RECRUIT_SCOPE) return null;
    return mapPayloadToAccountUser(payload);
  } catch {
    return parseDevelopmentJsonCookie(token);
  }
}

export { SESSION_COOKIE_NAME };
