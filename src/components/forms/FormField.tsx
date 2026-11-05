import type { ReactNode } from "react";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";

const hintId = (id: string) => `${id}-hint`;
const errorId = (id: string) => `${id}-error`;

/** Label + control + hint/error, wired up for screen readers via `describedBy()`. */
export function FormField({
  id,
  label,
  required,
  hint,
  error,
  aside,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  /** Right-aligned content next to the label, e.g. a character counter. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-end justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? (
            <span className="text-destructive" aria-hidden>
              *
            </span>
          ) : null}
        </Label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={errorId(id)} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId(id)} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria-describedby value matching FormField's hint/error ids. */
export function describedBy(id: string, opts: { error?: string; hint?: boolean }) {
  if (opts.error) return errorId(id);
  if (opts.hint) return hintId(id);
  return undefined;
}
