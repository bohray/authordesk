import { withApi } from "@/server/http/with-api";
import { ok } from "@/server/http/responses";
import { getTicketDetail, updateTicketAsAdmin } from "@/server/services/admin-ticket.service";
import { ticketIdParamSchema, updateTicketSchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";

export const GET = withApi(
  { roles: ["ADMIN"], schemas: { params: ticketIdParamSchema } },
  async ({ params }) => ok(await getTicketDetail(params.ticketId)),
);

export const PATCH = withApi(
  { roles: ["ADMIN"], schemas: { params: ticketIdParamSchema, body: updateTicketSchema } },
  async ({ session, params, body }) => ok(await updateTicketAsAdmin(session, params.ticketId, body)),
);
