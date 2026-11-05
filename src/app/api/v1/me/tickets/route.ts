import { withApi } from "@/server/http/withApi";
import { created, paginated } from "@/server/http/responses";
import { authorTicketQuerySchema } from "@/shared/schemas/ticket.schema";
import { createMyTicket, listMyTickets } from "@/server/services/ticket.service";
import { createTicketSchema } from "@/shared/schemas/ticket.schema";

export const runtime = "nodejs";

export const GET = withApi(
  { roles: ["AUTHOR"], schemas: { query: authorTicketQuerySchema } },
  async ({ session, query }) => {
    const { items, total } = await listMyTickets(session, query.page, query.limit);
    return paginated(items, query.page, query.limit, total);
  },
);

export const POST = withApi(
  { roles: ["AUTHOR"], schemas: { body: createTicketSchema } },
  async ({ session, body }) => created(await createMyTicket(session, body)),
);
