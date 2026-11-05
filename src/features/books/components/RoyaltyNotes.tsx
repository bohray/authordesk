import { AlertTriangle, Info, CircleDashed } from "lucide-react";
import { toneText } from "@/components/common/tones";
import { cn } from "@/lib/utils";
import type { NoteTone, RoyaltyNote } from "@/features/books/utils/royalty";

const styles: Record<NoteTone, { cls: string; Icon: typeof Info }> = {
  info: { cls: toneText.info, Icon: Info },
  warn: { cls: toneText.warn, Icon: AlertTriangle },
  muted: { cls: "text-muted-foreground", Icon: CircleDashed },
};

export function RoyaltyNotes({ notes, className }: { notes: RoyaltyNote[]; className?: string }) {
  if (notes.length === 0) return null;
  return (
    <ul className={cn("space-y-0.5", className)}>
      {notes.map((n) => {
        const { cls, Icon } = styles[n.tone];
        return (
          <li key={n.text} className={cn("flex items-start gap-1 text-xs whitespace-normal", cls)}>
            <Icon className="mt-0.5 size-3 shrink-0" aria-hidden />
            <span>{n.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
