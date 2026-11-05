import { withApi } from "@/server/http/withApi";
import { ok } from "@/server/http/responses";
import { getAdminStats } from "@/server/services/stats.service";

export const runtime = "nodejs";

export const GET = withApi({ roles: ["ADMIN"] }, async () => ok(await getAdminStats()));
