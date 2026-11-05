import "server-only";
import { z } from "zod";

/**
 * The ONLY place process.env is read. Secrets never leave the server:
 * nothing here is prefixed NEXT_PUBLIC_, so Next.js never inlines it into client bundles.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  PUBLISHER_NAME: z.string().default("Inkwell Publishing"),

  // AI: all optional. Without keys the app degrades to rule-based classification + manual replies.
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_CLASSIFY_MODEL: z.string().default("gemini-2.5-flash-lite"),
  GEMINI_DRAFT_MODEL: z.string().default("gemini-2.5-flash"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Lazily parsed so `next build` doesn't require runtime secrets. */
export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** For tests only. */
export function resetEnvCache() {
  cached = null;
}
