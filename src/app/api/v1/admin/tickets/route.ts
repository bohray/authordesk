import { withApi } from "@/server/http/withApi";
import { paginated } from "@/server/http/responses";
import { listQueue } from "@/server/services/adminTicket.service";
import { adminTicketQuerySchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";

export const GET = withApi(
  { roles: ["ADMIN"], schemas: { query: adminTicketQuerySchema } },
  async ({ session, query }) => {
    const { items, total } = await listQueue(session, query);
    return paginated(items, query.page, query.limit, total);
  },
);
