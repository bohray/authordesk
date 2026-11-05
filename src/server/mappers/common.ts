import "server-only";

/** Dates cross the wire as ISO strings (see dto.ts). */
export function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toISOString();
}

export function isoRequired(d: Date | string): string {
  return new Date(d).toISOString();
}
