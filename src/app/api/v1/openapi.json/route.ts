import { withApi } from "@/server/http/withApi";
import { getOpenApiDocument } from "@/server/openapi/document";

export const runtime = "nodejs";

// Returned bare (not in the `{ data }` envelope): tools such as Swagger UI expect the raw document.
export const GET = withApi({ auth: false }, async () => Response.json(getOpenApiDocument()));
