import "server-only";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  type ResponseConfig,
  type RouteConfig,
} from "@asteasolutions/zod-to-openapi";
import { z, type ZodType } from "zod";
import { SESSION_COOKIE } from "@/shared/constants/roles";
import { loginSchema } from "@/shared/schemas/auth.schema";
import {
  adminTicketQuerySchema,
  createMessageSchema,
  createNoteSchema,
  createTicketSchema,
  ticketIdParamSchema,
  updateTicketSchema,
  updatesQuerySchema,
} from "@/shared/schemas/ticket.schema";
import { authorTicketQuerySchema } from "../services/schemas";
import * as R from "./response-schemas";

/**
 * OpenAPI 3.0 document generated from the same Zod schemas the API validates with,
 * so the docs cannot drift from the real request contract.
 */

type Resp = Record<number, ResponseConfig>;

const json = (schema: ZodType, description: string): ResponseConfig => ({
  description,
  content: { "application/json": { schema } },
});

function build() {
  const registry = new OpenAPIRegistry();

  registry.registerComponent("securitySchemes", "cookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: SESSION_COOKIE,
    description: "httpOnly session JWT set by POST /auth/login.",
  });

  // Components
  const ErrorBody = registry.register("ErrorBody", R.ErrorBodySchema);
  const SessionUser = registry.register("SessionUser", R.SessionUserSchema);
  // Registered so nested uses (MyBooks.books, bookDetails) render as a $ref.
  registry.register("Book", R.BookSchema);
  const MyBooks = registry.register("MyBooks", R.MyBooksSchema);
  const AuthorTicket = registry.register("AuthorTicket", R.AuthorTicketSchema);
  const AdminTicketListItem = registry.register("AdminTicketListItem", R.AdminTicketListItemSchema);
  const AdminTicketDetail = registry.register("AdminTicketDetail", R.AdminTicketDetailSchema);
  const TicketNote = registry.register("TicketNote", R.TicketNoteSchema);
  const Draft = registry.register("Draft", R.DraftSchema);
  const AdminStats = registry.register("AdminStats", R.AdminStatsSchema);
  const Updates = registry.register("Updates", R.UpdatesSchema);
  const Meta = registry.register("PaginationMeta", R.PaginationMetaSchema);

  // Shared schemas were built before Zod was extended (see response-schemas.ts), so they
  // are cloned to gain `.openapi()`. Validation, refinements and transforms are unchanged.
  const LoginRequest = registry.register("LoginRequest", loginSchema.clone());
  const CreateTicketRequest = registry.register("CreateTicketRequest", createTicketSchema.clone());
  const CreateMessageRequest = registry.register("CreateMessageRequest", createMessageSchema.clone());
  const CreateNoteRequest = registry.register("CreateNoteRequest", createNoteSchema.clone());
  const UpdateTicketRequest = registry.register("UpdateTicketRequest", updateTicketSchema.clone());

  const data = (schema: ZodType) => z.object({ data: schema });
  const page = (schema: ZodType) => z.object({ data: z.array(schema), meta: Meta });
  const body = (schema: ZodType) => ({ content: { "application/json": { schema } }, required: true });
  const err = (description: string) => json(ErrorBody, description);

  // Errors every authenticated endpoint can produce.
  const authErrors: Resp = { 401: err("Not signed in"), 500: err("Unexpected server error") };
  const roleErrors: Resp = { ...authErrors, 403: err("Signed in with the wrong role") };
  const ticketErrors: Resp = {
    ...roleErrors,
    404: err("Ticket not found (or not yours)"),
    422: err("Invalid ticket id"),
  };

  const secured = [{ cookieAuth: [] }];
  const route = (r: RouteConfig) =>
    registry.registerPath({ security: secured, ...r, path: `/api/v1${r.path}` });
  const ticketPath = { params: ticketIdParamSchema };

  // ---- Auth
  route({
    method: "post",
    path: "/auth/login",
    tags: ["Auth"],
    summary: "Sign in; sets the session cookie",
    security: [],
    request: { body: body(LoginRequest) },
    responses: {
      200: json(data(SessionUser), "Signed in"),
      401: err("Invalid email or password"),
      422: err("Validation error"),
      429: err("Too many failed attempts (5 per email per 15 minutes)"),
    },
  });
  route({
    method: "post",
    path: "/auth/logout",
    tags: ["Auth"],
    summary: "Clear the session cookie",
    security: [],
    responses: { 204: { description: "Signed out" } },
  });
  route({
    method: "get",
    path: "/auth/me",
    tags: ["Auth"],
    summary: "Current user",
    responses: { 200: json(data(SessionUser), "Current user"), ...authErrors },
  });

  // ---- Author
  route({
    method: "get",
    path: "/me/books",
    tags: ["Author"],
    summary: "My books, royalty totals and next payout date",
    responses: { 200: json(data(MyBooks), "Books"), ...roleErrors },
  });
  route({
    method: "get",
    path: "/me/tickets",
    tags: ["Author"],
    summary: "My tickets, newest first",
    request: { query: authorTicketQuerySchema },
    responses: { 200: json(page(AuthorTicket), "Tickets"), ...roleErrors, 422: err("Invalid query") },
  });
  route({
    method: "post",
    path: "/me/tickets",
    tags: ["Author"],
    summary: "Open a ticket (AI classification runs after the response)",
    request: { body: body(CreateTicketRequest) },
    responses: {
      201: json(data(AuthorTicket), "Created"),
      ...roleErrors,
      422: err("Validation error (including a bookId that is not yours)"),
    },
  });
  route({
    method: "get",
    path: "/me/tickets/{ticketId}",
    tags: ["Author"],
    summary: "One of my tickets",
    request: ticketPath,
    responses: { 200: json(data(AuthorTicket), "Ticket"), ...ticketErrors },
  });
  route({
    method: "post",
    path: "/me/tickets/{ticketId}/messages",
    tags: ["Author"],
    summary: "Add a follow-up message (reopens a resolved ticket)",
    request: { ...ticketPath, body: body(CreateMessageRequest) },
    responses: {
      201: json(data(AuthorTicket), "Updated ticket"),
      ...ticketErrors,
      409: err("Ticket is closed"),
    },
  });

  // ---- Admin
  route({
    method: "get",
    path: "/admin/tickets",
    tags: ["Admin"],
    summary: "Ticket queue with filters (multi-value filters are comma-separated)",
    request: { query: adminTicketQuerySchema },
    responses: {
      200: json(page(AdminTicketListItem), "Queue page"),
      ...roleErrors,
      422: err("Invalid query"),
    },
  });
  route({
    method: "get",
    path: "/admin/tickets/{ticketId}",
    tags: ["Admin"],
    summary: "Full ticket with author context, notes and timeline",
    request: ticketPath,
    responses: { 200: json(data(AdminTicketDetail), "Ticket"), ...ticketErrors },
  });
  route({
    method: "patch",
    path: "/admin/tickets/{ticketId}",
    tags: ["Admin"],
    summary: "Change status, override category/priority, or (un)assign",
    request: { ...ticketPath, body: body(UpdateTicketRequest) },
    responses: { 200: json(data(AdminTicketDetail), "Updated ticket"), ...ticketErrors },
  });
  route({
    method: "post",
    path: "/admin/tickets/{ticketId}/messages",
    tags: ["Admin"],
    summary: "Reply to the author",
    request: { ...ticketPath, body: body(CreateMessageRequest) },
    responses: {
      201: json(data(AdminTicketDetail), "Updated ticket"),
      ...ticketErrors,
      409: err("Ticket is closed"),
    },
  });
  route({
    method: "post",
    path: "/admin/tickets/{ticketId}/notes",
    tags: ["Admin"],
    summary: "Add an internal note (never visible to authors)",
    request: { ...ticketPath, body: body(CreateNoteRequest) },
    responses: { 201: json(data(TicketNote), "Created note"), ...ticketErrors },
  });
  route({
    method: "get",
    path: "/admin/tickets/{ticketId}/draft",
    tags: ["Admin", "AI"],
    summary: "Cached (or freshly generated) AI reply draft",
    request: ticketPath,
    responses: { 200: json(data(Draft), "Draft (status UNAVAILABLE when AI is down)"), ...ticketErrors },
  });
  route({
    method: "post",
    path: "/admin/tickets/{ticketId}/draft/regenerate",
    tags: ["Admin", "AI"],
    summary: "Force a new AI reply draft",
    request: ticketPath,
    responses: { 200: json(data(Draft), "Draft"), ...ticketErrors },
  });
  route({
    method: "post",
    path: "/admin/tickets/{ticketId}/ai/retry",
    tags: ["Admin", "AI"],
    summary: "Re-run AI classification now",
    request: ticketPath,
    responses: { 200: json(data(AdminTicketDetail), "Ticket after classification"), ...ticketErrors },
  });
  route({
    method: "get",
    path: "/admin/stats",
    tags: ["Admin"],
    summary: "Queue and AI health metrics",
    responses: { 200: json(data(AdminStats), "Stats"), ...roleErrors },
  });

  // ---- Polling
  route({
    method: "get",
    path: "/updates",
    tags: ["Polling"],
    summary: "Ticket ids changed since a timestamp (authors see only their own)",
    request: { query: updatesQuerySchema },
    responses: { 200: json(data(Updates), "Changes"), ...authErrors, 422: err("Invalid since") },
  });
  route({
    method: "get",
    path: "/openapi.json",
    tags: ["Meta"],
    summary: "This document",
    security: [],
    responses: { 200: { description: "OpenAPI 3.0 document" } },
  });

  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.3",
    info: {
      title: "AuthorDesk API",
      version: "1.0.0",
      description:
        "Author support portal. Every error uses the `ErrorBody` envelope; success bodies are `{ data }` or `{ data, meta }` for paginated lists.",
    },
    servers: [{ url: "/" }],
  });
}

type OpenApiDocument = ReturnType<typeof build>;
let cached: OpenApiDocument | null = null;

/** Built once per server instance: the document only changes when the code does. */
export function getOpenApiDocument(): OpenApiDocument {
  return (cached ??= build());
}
