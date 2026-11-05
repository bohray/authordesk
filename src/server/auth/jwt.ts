import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/shared/constants/roles";

/**
 * JWT helpers. Deliberately free of `server-only`/Mongo imports so `src/proxy.ts`
 * can verify tokens without touching the database.
 */
export interface SessionClaims {
  sub: string; // user id
  role: Role;
  name: string;
  email: string;
  authorCode?: string;
}

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims, secret: string, ttlHours: number) {
  return new SignJWT({ role: claims.role, name: claims.name, email: claims.email, authorCode: claims.authorCode })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`)
    .sign(key(secret));
}

export async function verifySession(token: string, secret: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    if (!payload.sub || (payload.role !== "AUTHOR" && payload.role !== "ADMIN")) return null;
    return {
      sub: payload.sub,
      role: payload.role,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      authorCode: payload.authorCode ? String(payload.authorCode) : undefined,
    };
  } catch {
    return null;
  }
}
