"use client";

import { ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoAccounts, roleLabels, type DemoAccount } from "@/constants/auth";
import type { Role } from "@/shared/constants/roles";

const roleIcons = {
  AUTHOR: UserRound,
  ADMIN: ShieldCheck,
} as const satisfies Record<Role, LucideIcon>;

function DemoAccountButton({
  account,
  selected,
  disabled,
  onPick,
}: {
  account: DemoAccount;
  selected: boolean;
  disabled: boolean;
  onPick: (account: DemoAccount) => void;
}) {
  const Icon = roleIcons[account.role];
  return (
    <button
      type="button"
      onClick={() => onPick(account)}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border bg-background px-3 py-2 text-left interactive pressable hover:border-primary/25 hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60",
        selected && "border-primary/40 bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/10",
      )}
    >
      <Icon
        className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground", selected && "text-primary")}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
          {account.label}
          <span className="rounded bg-muted px-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            {roleLabels[account.role]}
          </span>
        </span>
        <span className="block truncate font-mono text-xs text-muted-foreground">
          {account.email} · {account.password}
        </span>
        <span className="block text-xs text-muted-foreground">{account.note}</span>
      </span>
    </button>
  );
}

export function DemoAccounts({
  onPick,
  selectedEmail,
  disabled = false,
}: {
  onPick: (account: DemoAccount) => void;
  selectedEmail?: string;
  /** True while signing in, so a click can't swap credentials mid-request. */
  disabled?: boolean;
}) {
  return (
    <section aria-labelledby="demo-accounts-heading" className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 id="demo-accounts-heading" className="text-sm font-medium">
          Demo accounts
        </h2>
        <span className="text-xs text-muted-foreground">Click to fill</span>
      </div>
      <ul className="grid gap-2">
        {demoAccounts.map((account) => (
          <li key={account.email}>
            <DemoAccountButton
              account={account}
              selected={selectedEmail === account.email}
              disabled={disabled}
              onPick={onPick}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
