import "server-only";
import type { LoginInput } from "@/shared/schemas/auth.schema";
import type { SessionUserDTO } from "@/shared/types/dto";
import type { SessionClaims } from "../auth/jwt";
import { hashPassword, verifyPassword } from "../auth/password";
import type { Session } from "../auth/session";
import { Errors } from "../http/errors";
import { assertLoginAllowed, clearLoginFailures, recordLoginFailure } from "../lib/rate-limit";
import { toSessionUserDTO } from "../mappers/user.mapper";
import { findUserByEmailWithPassword, findUserById } from "../repositories/user.repository";

const INVALID_CREDENTIALS = "Invalid email or password";

// Compared against when the email is unknown, so both paths cost one bcrypt check and
// response timing doesn't reveal which emails have accounts.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password"));

export async function login(input: LoginInput): Promise<{ user: SessionUserDTO; claims: SessionClaims }> {
  await assertLoginAllowed(input.email);

  const user = await findUserByEmailWithPassword(input.email);
  const valid = await verifyPassword(input.password, user?.passwordHash ?? (await getDummyHash()));

  if (!user || !valid) {
    await recordLoginFailure(input.email);
    throw Errors.unauthenticated(INVALID_CREDENTIALS);
  }

  await clearLoginFailures(input.email);
  const dto = toSessionUserDTO(user);
  return {
    user: dto,
    claims: { sub: dto.id, role: dto.role, name: dto.name, email: dto.email, authorCode: dto.authorCode },
  };
}

/** Re-reads the user so a deleted account stops working even with a still-valid JWT. */
export async function getCurrentUser(session: Session): Promise<SessionUserDTO> {
  const user = await findUserById(session.userId);
  if (!user) throw Errors.unauthenticated();
  return toSessionUserDTO(user);
}
