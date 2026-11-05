import "server-only";
import { LoginAttempt, loginAttemptTtlSeconds } from "../db/models";
import { Errors } from "../http/errors";
import { msPerMinute, msPerSecond } from "./time";

/**
 * Login brute-force protection. Failures are stored in MongoDB (not in memory) so the
 * limit holds across serverless instances; the collection's TTL index (15 min) does the
 * cleanup. We still filter by createdAt because the TTL monitor only runs about once a minute.
 */
export const loginMaxFailures = 5;
/** Same length as the collection's TTL, so a failure stops counting when it expires. */
export const loginWindowMs = loginAttemptTtlSeconds * msPerSecond;
const tooManyAttemptsMessage = `Too many failed sign-in attempts. Please try again in ${
  loginWindowMs / msPerMinute
} minutes.`;

const keyFor = (email: string) => `login:${email.toLowerCase()}`;

export async function assertLoginAllowed(email: string) {
  const failures = await LoginAttempt.countDocuments({
    key: keyFor(email),
    createdAt: { $gt: new Date(Date.now() - loginWindowMs) },
  });
  if (failures >= loginMaxFailures) {
    throw Errors.rateLimited(tooManyAttemptsMessage);
  }
}

export async function recordLoginFailure(email: string) {
  await LoginAttempt.create({ key: keyFor(email) });
}

export async function clearLoginFailures(email: string) {
  await LoginAttempt.deleteMany({ key: keyFor(email) });
}
