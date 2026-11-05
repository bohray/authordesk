import { API_BASE, API_ROUTES, ROUTES } from "@/constants/routes";
import { MESSAGES } from "@/constants/messages";
import type { ApiErrorBody, ErrorCode, Paginated } from "@/shared/types/dto";

export interface ApiErrorDetail {
  in?: string;
  path: string;
  message: string;
}

export type ClientErrorCode = ErrorCode | "NETWORK_ERROR" | "UNKNOWN";

/** Normalised error thrown by every API call. `status` is 0 for network failures. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ClientErrorCode;
  readonly details: ApiErrorDetail[];

  constructor(status: number, code: ClientErrorCode, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Statuses that mean "this id doesn't point at anything you can see" (bad id, missing, not yours). */
const NOT_FOUND_STATUSES: ReadonlySet<number> = new Set([400, 404, 422]);

/** True when a detail page should show "not found" instead of a retryable error. */
export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && NOT_FOUND_STATUSES.has(error.status);
}

/** User-facing message for any thrown value. */
export function getErrorMessage(error: unknown, fallback: string = MESSAGES.genericError): string {
  if (isApiError(error)) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Maps 422 details onto form field names: `{ subject: "Too short" }`. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || error.details.length === 0) return {};
  const out: Record<string, string> = {};
  for (const d of error.details) {
    if (d.path && !out[d.path]) out[d.path] = d.message;
  }
  return out;
}

function normaliseDetails(raw: unknown): ApiErrorDetail[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): ApiErrorDetail[] => {
    if (!item || typeof item !== "object") return [];
    const rec = item as Record<string, unknown>;
    const path = Array.isArray(rec.path)
      ? rec.path.map(String).join(".")
      : typeof rec.path === "string"
        ? rec.path
        : "";
    return [
      {
        in: typeof rec.in === "string" ? rec.in : undefined,
        path,
        message: typeof rec.message === "string" ? rec.message : "Invalid value",
      },
    ];
  });
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  /** Skip the global 401 → /login redirect (used by the login call itself). */
  skipAuthRedirect?: boolean;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ""}`;
}

let redirectingToLogin = false;

function redirectToLogin() {
  if (typeof window === "undefined" || redirectingToLogin) return;
  if (window.location.pathname === ROUTES.login) return;
  redirectingToLogin = true;
  const next = window.location.pathname + window.location.search;
  // Hard navigation on purpose: drops all client state and lets the proxy re-check the cookie.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${ROUTES.login}?next=${encodeURIComponent(next)}`);
}

async function rawRequest(path: string, options: RequestOptions = {}): Promise<unknown> {
  const { method = "GET", body, query, signal, skipAuthRedirect } = options;
  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "NETWORK_ERROR", MESSAGES.networkError);
  }

  if (res.status === 204) return null;

  let json: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const errBody = (json as Partial<ApiErrorBody> | null)?.error;
    const error = new ApiError(
      res.status,
      (errBody?.code as ClientErrorCode | undefined) ?? "UNKNOWN",
      errBody?.message ?? (res.status === 401 ? MESSAGES.sessionExpired : MESSAGES.genericError),
      normaliseDetails(errBody?.details),
    );
    const isLoginCall = path === API_ROUTES.auth.login;
    if (res.status === 401 && !skipAuthRedirect && !isLoginCall) redirectToLogin();
    throw error;
  }

  return json;
}

/** Calls the API and unwraps `{ data }`. */
export async function apiRequest<T>(path: string, options?: RequestOptions): Promise<T> {
  const json = await rawRequest(path, options);
  if (json === null) return undefined as T;
  return (json as { data: T }).data;
}

/** Calls a paginated endpoint and returns `{ data, meta }` as is. */
export async function apiRequestPaginated<T>(
  path: string,
  options?: RequestOptions,
): Promise<Paginated<T>> {
  const json = (await rawRequest(path, options)) as Paginated<T> | null;
  return json ?? { data: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } };
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) =>
    apiRequest<T>(path, { query, signal }),
  getPaginated: <T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) =>
    apiRequestPaginated<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body" | "method">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
};
