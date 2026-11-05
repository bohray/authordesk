import { SignJWT, jwtVerify } from "jose";
import { userRoles, type Role } from "@/shared/constants/roles";

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

const signingAlgorithm = "HS256";

function key(secret: string) {
  return new TextEncoder().encode(secret);
}

function isRole(value: unknown): value is Role {
  return userRoles.some((role) => role === value);
}

export async function signSession(claims: SessionClaims, secret: string, ttlHours: number) {
  return new SignJWT({ role: claims.role, name: claims.name, email: claims.email, authorCode: claims.authorCode })
    .setProtectedHeader({ alg: signingAlgorithm })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`)
    .sign(key(secret));
}

export async function verifySession(token: string, secret: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: [signingAlgorithm] });
    if (!payload.sub || !isRole(payload.role)) return null;
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
