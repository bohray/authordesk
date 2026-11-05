import "server-only";
import type { ErrorCode } from "@/shared/types/dto";

const httpStatusByCode: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  AI_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

/** Throw from anywhere in the server; `withApi` turns it into a consistent JSON error. */
export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = httpStatusByCode[code];
  }
}

export const Errors = {
  unauthenticated: (msg = "Please sign in to continue") => new AppError("UNAUTHENTICATED", msg),
  forbidden: (msg = "You do not have access to this resource") => new AppError("FORBIDDEN", msg),
  notFound: (what = "Resource") => new AppError("NOT_FOUND", `${what} not found`),
  badRequest: (msg: string, details?: unknown) => new AppError("BAD_REQUEST", msg, details),
  validation: (details: unknown, msg = "Request validation failed") =>
    new AppError("VALIDATION_ERROR", msg, details),
  conflict: (msg: string) => new AppError("CONFLICT", msg),
  /** Replying to a CLOSED ticket (author or admin side). */
  ticketClosed: () => new AppError("CONFLICT", "This ticket is closed. Please open a new ticket."),
  rateLimited: (msg = "Too many requests, please try again later") =>
    new AppError("RATE_LIMITED", msg),
};
