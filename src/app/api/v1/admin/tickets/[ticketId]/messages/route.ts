import { withApi } from "@/server/http/withApi";
import { created } from "@/server/http/responses";
import { replyAsAdmin } from "@/server/services/adminTicket.service";
import { createMessageSchema, ticketIdParamSchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";

export const POST = withApi(
  { roles: ["ADMIN"], schemas: { params: ticketIdParamSchema, body: createMessageSchema } },
  async ({ session, params, body }) => created(await replyAsAdmin(session, params.ticketId, body)),
);
