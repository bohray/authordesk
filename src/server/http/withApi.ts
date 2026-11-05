import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodType } from "zod";
import type { Role } from "@/shared/constants/roles";
import type { ApiErrorBody } from "@/shared/types/dto";
import { readSession, type Session } from "../auth/session";
import { connectDB } from "../db/connect";
import { logger } from "../lib/logger";
import { AppError, Errors } from "./errors";

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

type Infer<S, K extends keyof Schemas> = S extends { [P in K]: infer T }
  ? T extends ZodType
    ? z.output<T>
    : undefined
  : undefined;

export interface ApiContext<S extends Schemas, A extends boolean> {
  req: NextRequest;
  session: A extends true ? Session : Session | null;
  body: Infer<S, "body">;
  query: Infer<S, "query">;
  params: Infer<S, "params">;
}

interface Options<S extends Schemas, A extends boolean> {
  /** Default true. Set false only for public endpoints (login). */
  auth?: A;
  /** Restrict to roles. Omit to allow any authenticated user. */
  roles?: Role[];
  schemas?: S;
}

type RouteCtx = { params: Promise<Record<string, string | string[]>> };

type RequestPart = "params" | "query" | "body";

/** MongoDB's error code for a unique-index violation. */
const mongoDuplicateKeyCode = 11000;
const invalidJsonMessage = "Request body must be valid JSON";
const duplicateRecordMessage = "A record with these details already exists";

/**
 * Every API route goes through this wrapper, in this order:
 *   authenticate (401) → authorise role (403) → validate params/query/body (422)
 *   → connect DB → handler → map errors to `{ error: { code, message, details? } }`.
 * Validation runs before connecting so malformed requests never touch the database.
 * Route files therefore stay thin and can never forget an auth or validation step.
 */
export function withApi<S extends Schemas = Schemas, A extends boolean = true>(
  options: Options<S, A>,
  handler: (ctx: ApiContext<S, A>) => Promise<NextResponse | Response>,
) {
  return async (req: NextRequest, routeCtx: RouteCtx) => {
    try {
      const session = await authorise(req, options);
      const schemas: Schemas = options.schemas ?? {};
      const params = schemas.params
        ? parse(schemas.params, await routeCtx?.params, "params")
        : undefined;
      const query = schemas.query
        ? parse(schemas.query, Object.fromEntries(req.nextUrl.searchParams), "query")
        : undefined;
      const body = schemas.body ? parse(schemas.body, await readJsonBody(req), "body") : undefined;

      await connectDB();
      // The generic Infer<> types can't be derived from the runtime checks above, hence the cast.
      return await handler({ req, session, body, query, params } as ApiContext<S, A>);
    } catch (err) {
      return toErrorResponse(err, req);
    }
  };
}

/** 401 when a session is required but missing; 403 when the role is not allowed. */
async function authorise<S extends Schemas, A extends boolean>(
  req: NextRequest,
  options: Options<S, A>,
): Promise<Session | null> {
  const session = await readSession(req);
  const requireAuth = options.auth !== false;
  if (requireAuth && !session) throw Errors.unauthenticated();
  if (options.roles && (!session || !options.roles.includes(session.role))) {
    throw Errors.forbidden();
  }
  return session;
}

async function readJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw Errors.badRequest(invalidJsonMessage);
  }
}

function parse(schema: ZodType, value: unknown, where: RequestPart) {
  const result = schema.safeParse(value ?? {});
  if (!result.success) {
    throw Errors.validation(
      result.error.issues.map((issue) => ({
        in: where,
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === mongoDuplicateKeyCode
  );
}

function appErrorResponse(err: AppError) {
  const body: ApiErrorBody = {
    error: {
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  };
  return NextResponse.json(body, { status: err.status });
}

export function toErrorResponse(err: unknown, req?: NextRequest) {
  if (err instanceof AppError) return appErrorResponse(err);
  // Mongo duplicate key → 409 instead of a generic 500.
  if (isDuplicateKeyError(err)) return appErrorResponse(Errors.conflict(duplicateRecordMessage));
  logger.error("Unhandled API error", {
    path: req?.nextUrl.pathname,
    method: req?.method,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  return appErrorResponse(Errors.internal());
}
