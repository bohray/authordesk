import { withApi } from "@/server/http/withApi";
import { ok } from "@/server/http/responses";
import { retryClassification } from "@/server/services/adminTicket.service";
import { ticketIdParamSchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";
export const maxDuration = 30;

export const POST = withApi(
  { roles: ["ADMIN"], schemas: { params: ticketIdParamSchema } },
  async ({ params }) => ok(await retryClassification(params.ticketId)),
);
