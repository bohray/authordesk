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

/**
 * Every API route goes through this wrapper, in this order:
 *   connect DB → authenticate (401) → authorise role (403) → validate params/query/body (422)
 *   → handler → map errors to `{ error: { code, message, details? } }`.
 * Route files therefore stay thin and can never forget an auth or validation step.
 */
export function withApi<S extends Schemas = Schemas, A extends boolean = true>(
  options: Options<S, A>,
  handler: (ctx: ApiContext<S, A>) => Promise<NextResponse | Response>,
) {
  return async (req: NextRequest, routeCtx: RouteCtx) => {
    try {
      const requireAuth = options.auth !== false;
      const session = await readSession(req);
      if (requireAuth && !session) throw Errors.unauthenticated();
      if (options.roles && (!session || !options.roles.includes(session.role))) {
        throw Errors.forbidden();
      }

      const s = options.schemas ?? ({} as S);
      const params = s.params ? parse(s.params, await routeCtx?.params, "params") : undefined;
      const query = s.query
        ? parse(s.query, Object.fromEntries(req.nextUrl.searchParams), "query")
        : undefined;
      let body: unknown = undefined;
      if (s.body) {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          throw Errors.badRequest("Request body must be valid JSON");
        }
        body = parse(s.body, raw, "body");
      }

      await connectDB();
      return await handler({ req, session, body, query, params } as ApiContext<S, A>);
    } catch (err) {
      return toErrorResponse(err, req);
    }
  };
}

function parse(schema: ZodType, value: unknown, where: string) {
  const result = schema.safeParse(value ?? {});
  if (!result.success) {
    throw Errors.validation(
      result.error.issues.map((i) => ({ in: where, path: i.path.join("."), message: i.message })),
    );
  }
  return result.data;
}

export function toErrorResponse(err: unknown, req?: NextRequest) {
  if (err instanceof AppError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    };
    return NextResponse.json(body, { status: err.status });
  }
  // Mongo duplicate key → 409 instead of a generic 500.
  if (typeof err === "object" && err && "code" in err && (err as { code: unknown }).code === 11000) {
    return NextResponse.json<ApiErrorBody>(
      { error: { code: "CONFLICT", message: "A record with these details already exists" } },
      { status: 409 },
    );
  }
  logger.error("Unhandled API error", {
    path: req?.nextUrl.pathname,
    method: req?.method,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  return NextResponse.json<ApiErrorBody>(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side. Please try again." } },
    { status: 500 },
  );
}
