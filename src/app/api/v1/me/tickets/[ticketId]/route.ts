import { withApi } from "@/server/http/with-api";
import { ok } from "@/server/http/responses";
import { getMyTicket } from "@/server/services/ticket.service";
import { ticketIdParamSchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";

export const GET = withApi(
  { roles: ["AUTHOR"], schemas: { params: ticketIdParamSchema } },
  async ({ session, params }) => ok(await getMyTicket(session, params.ticketId)),
);
