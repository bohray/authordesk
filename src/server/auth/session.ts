import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { sessionCookie } from "@/shared/constants/roles";
import { env } from "../config/env";
import { secondsPerHour } from "../lib/time";
import { signSession, verifySession, type SessionClaims } from "./jwt";

export interface Session {
  userId: string;
  role: SessionClaims["role"];
  name: string;
  email: string;
  authorCode?: string;
}

export async function readSession(req: NextRequest): Promise<Session | null> {
  const token = req.cookies.get(sessionCookie)?.value;
  if (!token) return null;
  const claims = await verifySession(token, env().JWT_SECRET);
  if (!claims) return null;
  return {
    userId: claims.sub,
    role: claims.role,
    name: claims.name,
    email: claims.email,
    authorCode: claims.authorCode,
  };
}

export async function setSessionCookie(res: NextResponse, claims: SessionClaims) {
  const { JWT_SECRET, SESSION_TTL_HOURS, NODE_ENV } = env();
  const token = await signSession(claims, JWT_SECRET, SESSION_TTL_HOURS);
  res.cookies.set(sessionCookie, token, {
    httpOnly: true, // not readable by JS → XSS can't steal it
    secure: NODE_ENV === "production",
    sameSite: "lax", // blocks cross-site POSTs (CSRF) while allowing normal navigation
    path: "/",
    maxAge: SESSION_TTL_HOURS * secondsPerHour,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(sessionCookie, "", { httpOnly: true, path: "/", maxAge: 0 });
}
