import { withApi } from "@/server/http/withApi";
import { ok } from "@/server/http/responses";
import { getCurrentUser } from "@/server/services/auth.service";

export const runtime = "nodejs";

export const GET = withApi({}, async ({ session }) => ok(await getCurrentUser(session)));
