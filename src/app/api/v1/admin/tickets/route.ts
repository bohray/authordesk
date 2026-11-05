import { withApi } from "@/server/http/with-api";
import { paginated } from "@/server/http/responses";
import { listQueue } from "@/server/services/admin-ticket.service";
import { adminTicketQuerySchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";

export const GET = withApi(
  { roles: ["ADMIN"], schemas: { query: adminTicketQuerySchema } },
  async ({ session, query }) => {
    const { items, total } = await listQueue(session, query);
    return paginated(items, query.page, query.limit, total);
  },
);
