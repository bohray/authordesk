import { Sparkles, ListFilter, UserPen } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { sourceBadgeClasses, sourceDescriptions, sourceLabels } from "@/constants/ui";
import type { ClassificationSource } from "@/shared/constants/ticket";

const icons = { AI: Sparkles, RULE: ListFilter, ADMIN: UserPen } as const;

/** Small marker showing where a classification value came from: AI, keyword rule or admin edit. */
export function AiSourceBadge({
  source,
  className,
}: {
  source: ClassificationSource | null;
  className?: string;
}) {
  if (!source) return null;
  const Icon = icons[source];
  return (
    <Badge
      variant="outline"
      className={cn("h-4 border-0 px-1.5 text-[10px]", sourceBadgeClasses[source], className)}
      title={sourceDescriptions[source]}
    >
      <Icon aria-hidden />
      {sourceLabels[source]}
    </Badge>
  );
}
