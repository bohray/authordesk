import { Feather } from "lucide-react";
import { appName } from "@/constants/ui";
import { cn } from "@/lib/utils";

/** Square ink tile with a feather and a saffron "bookmark" notch. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20 ring-inset",
        className,
      )}
    >
      <Feather className="size-[55%]" strokeWidth={2} />
      <span className="absolute top-0 right-[22%] h-[28%] w-[14%] rounded-b-[2px] bg-highlight" />
    </span>
  );
}

/** "AuthorDesk" in the heading serif, optionally with the mark. */
export function Wordmark({
  className,
  withMark = true,
  markClassName,
  textClassName,
}: {
  className?: string;
  withMark?: boolean;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {withMark && <BrandMark className={markClassName} />}
      <span
        className={cn(
          "font-heading text-lg leading-none font-semibold tracking-tight text-foreground",
          textClassName,
        )}
      >
        {appName}
      </span>
    </span>
  );
}
