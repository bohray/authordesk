import { withApi } from "@/server/http/with-api";
import { ok } from "@/server/http/responses";
import { getUpdates } from "@/server/services/updates.service";
import { updatesQuerySchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";

export const GET = withApi({ schemas: { query: updatesQuerySchema } }, async ({ session, query }) =>
  ok(await getUpdates(session, new Date(query.since))),
);
