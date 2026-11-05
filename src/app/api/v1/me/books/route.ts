import { withApi } from "@/server/http/withApi";
import { ok } from "@/server/http/responses";
import { getMyBooks } from "@/server/services/book.service";

export const runtime = "nodejs";

export const GET = withApi({ roles: ["AUTHOR"] }, async ({ session }) =>
  ok(await getMyBooks(session.userId)),
);
