import { withApi } from "@/server/http/withApi";
import { ok } from "@/server/http/responses";
import { getDraft } from "@/server/services/adminTicket.service";
import { ticketIdParamSchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";
// Draft generation calls an LLM; give it headroom beyond the AI timeout.
export const maxDuration = 30;

export const GET = withApi(
  { roles: ["ADMIN"], schemas: { params: ticketIdParamSchema } },
  async ({ params }) => ok(await getDraft(params.ticketId)),
);
