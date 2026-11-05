"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface FileMeta {
  name: string;
  size: number;
  type?: string;
}

/**
 * Lightweight file picker. Only metadata leaves the component: callers never upload the file.
 */
export function FilePicker({
  id,
  value,
  onChange,
  maxBytes,
  accept,
  disabled,
  hint,
}: {
  id?: string;
  value: FileMeta | null;
  onChange: (file: FileMeta | null) => void;
  maxBytes: number;
  accept?: string;
  disabled?: boolean;
  hint?: string;
}) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const descriptionId = `${inputId}-desc`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (file.size > maxBytes) {
      setError(`"${file.name}" is ${formatBytes(file.size)}. The limit is ${formatBytes(maxBytes)}.`);
      return;
    }
    setError(null);
    onChange({ name: file.name, size: file.size, type: file.type || undefined });
  };
  const handleRemove = () => onChange(null);
  const handleBrowse = () => inputRef.current?.click();

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        aria-describedby={descriptionId}
      />
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(value.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleRemove}
            disabled={disabled}
            aria-label={`Remove ${value.name}`}
          >
            <X aria-hidden />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={handleBrowse} disabled={disabled}>
          <Paperclip aria-hidden />
          Attach a file
        </Button>
      )}
      <p
        id={descriptionId}
        className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}
        role={error ? "alert" : undefined}
      >
        {error ?? hint ?? `Max ${formatBytes(maxBytes)}.`}
      </p>
    </div>
  );
}
