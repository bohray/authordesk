import { PageHeader } from "@/components/common/page-header";

/** Shared by the queue and its `loading.tsx`, so the header never shifts. */
export function QueuePageHeader() {
  return (
    <PageHeader
      title="Ticket Queue"
      description="Unresolved tickets first, highest priority and oldest at the top."
    />
  );
}
