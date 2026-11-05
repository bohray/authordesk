"use client";

import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { messageMax } from "@/constants/ui";

const editorId = "admin-reply";
const errorId = `${editorId}-error`;
const hintId = `${editorId}-hint`;

/** Reply textarea with an inline error or hint underneath. Cmd/Ctrl+Enter sends. */
export function ReplyEditor({
  value,
  placeholder,
  disabled,
  error,
  hint,
  onChange,
  onSubmitShortcut,
}: {
  value: string;
  placeholder: string;
  disabled: boolean;
  error: string | null;
  hint: ReactNode;
  onChange: (text: string) => void;
  onSubmitShortcut: () => void;
}) {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value);
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmitShortcut();
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={editorId} className="sr-only">
        Reply message
      </Label>
      <Textarea
        id={editorId}
        rows={8}
        maxLength={messageMax}
        className="min-h-40"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : hintId}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
