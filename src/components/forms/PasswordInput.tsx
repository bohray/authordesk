"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const toggleLabels = { show: "Show password", hide: "Hide password" } as const;

/**
 * Password field with a show/hide toggle. The toggle is `type="button"` so it never submits
 * the form, and it inherits `disabled` from a surrounding <fieldset> (e.g. while signing in).
 */
export function PasswordInput({ className, id, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  const label = visible ? toggleLabels.hide : toggleLabels.show;
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input id={id} type={visible ? "text" : "password"} className={cn("pr-9", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        aria-controls={id}
        title={label}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground interactive hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
