import { Sparkles, ListFilter, UserPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SOURCE_BADGE_CLASSES, SOURCE_DESCRIPTIONS, SOURCE_LABELS } from "@/constants/ui";
import type { ClassificationSource } from "@/shared/constants/ticket";

const ICONS = { AI: Sparkles, RULE: ListFilter, ADMIN: UserPen } as const;

/** Small marker showing where a classification value came from: AI, keyword rule or admin edit. */
export function AiSourceBadge({
  source,
  className,
}: {
  source: ClassificationSource | null;
  className?: string;
}) {
  if (!source) return null;
  const Icon = ICONS[source];
  return (
    <Badge
      variant="outline"
      className={cn("h-4 border-0 px-1.5 text-[10px]", SOURCE_BADGE_CLASSES[source], className)}
      title={SOURCE_DESCRIPTIONS[source]}
    >
      <Icon aria-hidden />
      {SOURCE_LABELS[source]}
    </Badge>
  );
}
