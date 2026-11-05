import { clearSessionCookie } from "@/server/auth/session";
import { withApi } from "@/server/http/withApi";
import { noContent } from "@/server/http/responses";

export const runtime = "nodejs";

// Public on purpose: logging out with an expired/missing session should still succeed.
export const POST = withApi({ auth: false }, async () => {
  const res = noContent();
  clearSessionCookie(res);
  return res;
});
