import { z } from "zod";

/**
 * Request schemas the shared folder doesn't define yet. Kept server-side so the
 * foundation contract files stay untouched; candidates to move into src/shared/schemas.
 */
export const authorTicketQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AuthorTicketQuery = z.infer<typeof authorTicketQuerySchema>;
