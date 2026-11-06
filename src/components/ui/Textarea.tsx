import * as React from "react"
import { cn } from "cn"

/**
 * Auto-growing textarea (`field-sizing-content`), so the manual resize grip is removed
 * (`resize-none`). Growth is capped at `max-h-96`, after which it scrolls, so a long
 * message can't push the form's actions off screen.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 max-h-96 w-full resize-none overflow-y-auto rounded-lg border border-input bg-card px-3 py-2.5 text-base leading-relaxed shadow-xs transition-[color,border-color,box-shadow] outline-none [scrollbar-width:thin] placeholder:text-muted-foreground hover:border-ring/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:shadow-none dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
