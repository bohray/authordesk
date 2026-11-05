import { AlertTriangle, CircleDashed, Info, type LucideIcon } from "lucide-react";
import { toneText } from "@/components/common/tones";
import { cn } from "@/lib/utils";
import type { NoteTone, RoyaltyNote } from "@/features/books/utils/royalty";

const noteToneStyles = {
  info: { className: toneText.info, icon: Info },
  warn: { className: toneText.warn, icon: AlertTriangle },
  muted: { className: "text-muted-foreground", icon: CircleDashed },
} satisfies Record<NoteTone, { className: string; icon: LucideIcon }>;

export function RoyaltyNotes({ notes, className }: { notes: RoyaltyNote[]; className?: string }) {
  if (notes.length === 0) return null;
  return (
    <ul className={cn("space-y-0.5", className)}>
      {notes.map((note) => {
        const { className: toneClass, icon: Icon } = noteToneStyles[note.tone];
        return (
          <li key={note.text} className={cn("flex items-start gap-1 text-xs whitespace-normal", toneClass)}>
            <Icon className="mt-0.5 size-3 shrink-0" aria-hidden />
            <span>{note.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
