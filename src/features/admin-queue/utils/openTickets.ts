import type { AdminStatsDTO } from "@/shared/types/dto";

/** Every unresolved ticket, including UNCLASSIFIED ones that have no priority card. */
export function countOpenTickets(openByPriority: AdminStatsDTO["openByPriority"]): number {
  return Object.values(openByPriority).reduce((sum, n) => sum + (n ?? 0), 0);
}
