import { withApi } from "@/server/http/with-api";
import { ok } from "@/server/http/responses";
import { getDraft } from "@/server/services/admin-ticket.service";
import { ticketIdParamSchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";
// Draft generation calls an LLM; give it headroom beyond the AI timeout.
export const maxDuration = 30;

export const GET = withApi(
  { roles: ["ADMIN"], schemas: { params: ticketIdParamSchema } },
  async ({ params }) => ok(await getDraft(params.ticketId)),
);
