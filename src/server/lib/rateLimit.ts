import "server-only";
import { LoginAttempt } from "../db/models";
import { Errors } from "../http/errors";

/**
 * Login brute-force protection. Failures are stored in MongoDB (not in memory) so the
 * limit holds across serverless instances; the collection's TTL index (15 min) does the
 * cleanup. We still filter by createdAt because the TTL monitor only runs about once a minute.
 */
export const loginMaxFailures = 5;
export const loginWindowMs = 15 * 60 * 1000;

const keyFor = (email: string) => `login:${email.toLowerCase()}`;

export async function assertLoginAllowed(email: string) {
  const failures = await LoginAttempt.countDocuments({
    key: keyFor(email),
    createdAt: { $gt: new Date(Date.now() - loginWindowMs) },
  });
  if (failures >= loginMaxFailures) {
    throw Errors.rateLimited("Too many failed sign-in attempts. Please try again in 15 minutes.");
  }
}

export async function recordLoginFailure(email: string) {
  await LoginAttempt.create({ key: keyFor(email) });
}

export async function clearLoginFailures(email: string) {
  await LoginAttempt.deleteMany({ key: keyFor(email) });
}
