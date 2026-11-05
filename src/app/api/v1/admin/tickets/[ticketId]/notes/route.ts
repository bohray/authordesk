import { withApi } from "@/server/http/withApi";
import { created } from "@/server/http/responses";
import { addNote } from "@/server/services/adminTicket.service";
import { createNoteSchema, ticketIdParamSchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";

export const POST = withApi(
  { roles: ["ADMIN"], schemas: { params: ticketIdParamSchema, body: createNoteSchema } },
  async ({ session, params, body }) => created(await addNote(session, params.ticketId, body)),
);
