import { setSessionCookie } from "@/server/auth/session";
import { withApi } from "@/server/http/withApi";
import { ok } from "@/server/http/responses";
import { login } from "@/server/services/auth.service";
import { loginSchema } from "@/shared/schemas/auth.schema";

export const runtime = "nodejs";

export const POST = withApi({ auth: false, schemas: { body: loginSchema } }, async ({ body }) => {
  const { user, claims } = await login(body);
  const res = ok(user);
  await setSessionCookie(res, claims);
  return res;
});
