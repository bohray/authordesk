"use client";

import { ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DemoAccount {
  email: string;
  password: string;
  role: "AUTHOR" | "ADMIN";
  label: string;
  note: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "priya.sharma@email.com",
    password: "Author@123",
    role: "AUTHOR",
    label: "Priya Sharma",
    note: "Author with several live books",
  },
  {
    email: "kavita.deshmukh@email.com",
    password: "Author@123",
    role: "AUTHOR",
    label: "Kavita Deshmukh",
    note: "Book in production + royalty below payout threshold",
  },
  {
    email: "ananya.reddy@email.com",
    password: "Author@123",
    role: "AUTHOR",
    label: "Ananya Reddy",
    note: "Author who has never been paid",
  },
  {
    email: "admin@authordesk.dev",
    password: "Admin@123",
    role: "ADMIN",
    label: "Aisha Verma",
    note: "Ticket queue, AI drafts, dashboard",
  },
];

export function DemoAccounts({
  onPick,
  selectedEmail,
}: {
  onPick: (account: DemoAccount) => void;
  selectedEmail?: string;
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
        {DEMO_ACCOUNTS.map((a) => {
          const Icon = a.role === "ADMIN" ? ShieldCheck : UserRound;
          const selected = selectedEmail === a.email;
          return (
            <li key={a.email}>
              <button
                type="button"
                onClick={() => onPick(a)}
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border bg-background px-3 py-2 text-left transition-colors hover:border-primary/25 hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  selected && "border-primary/40 bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/10",
                )}
              >
                <Icon
                  className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground", selected && "text-primary")}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                    {a.label}
                    <span className="rounded bg-muted px-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      {a.role === "ADMIN" ? "Admin" : "Author"}
                    </span>
                  </span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {a.email} · {a.password}
                  </span>
                  <span className="block text-xs text-muted-foreground">{a.note}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
