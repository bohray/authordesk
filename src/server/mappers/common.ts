import "server-only";

/** Dates cross the wire as ISO strings (see dto.ts). */
export function iso(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return isoRequired(date);
}

export function isoRequired(date: Date | string): string {
  return new Date(date).toISOString();
}
