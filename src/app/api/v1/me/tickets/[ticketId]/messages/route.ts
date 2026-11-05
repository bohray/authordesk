import { withApi } from "@/server/http/with-api";
import { created } from "@/server/http/responses";
import { addMyMessage } from "@/server/services/ticket.service";
import { createMessageSchema, ticketIdParamSchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";

export const POST = withApi(
  { roles: ["AUTHOR"], schemas: { params: ticketIdParamSchema, body: createMessageSchema } },
  async ({ session, params, body }) => created(await addMyMessage(session, params.ticketId, body)),
);
