"use client";

import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Thin wrapper over the Base UI Select: string values, label lookup handled via `items`. */
export function SelectField({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled,
  invalid,
  size = "default",
  className,
  ariaLabel,
  ariaDescribedBy,
  renderValue,
}: {
  id?: string;
  value: string | null;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  size?: "sm" | "default";
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  renderValue?: (value: string) => ReactNode;
}) {
  return (
    <Select
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onValueChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        size={size}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        className={cn("w-full min-w-0", className)}
      >
        <SelectValue placeholder={placeholder}>
          {renderValue
            ? (v: string | null) => (v ? renderValue(v) : placeholder)
            : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
