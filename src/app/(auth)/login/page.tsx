import { Suspense } from "react";
import type { Metadata } from "next";
import { BookMarked, Inbox, Sparkles } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";

export const metadata: Metadata = { title: "Sign in" };

const POINTS = [
  { Icon: BookMarked, text: "Books, sales and royalties in one calm place" },
  { Icon: Sparkles, text: "Tickets triaged by AI, answered by real people" },
  { Icon: Inbox, text: "A live queue built for the operations team" },
] as const;

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="paper-texture relative hidden flex-col justify-between overflow-hidden border-r p-10 lg:flex xl:p-14">
        <Wordmark textClassName="text-2xl" markClassName="size-9" />
        <div className="max-w-lg space-y-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Author support portal
          </p>
          <p className="font-heading text-4xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl">
            Support for every author, <span className="text-primary italic">at scale.</span>
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {POINTS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-card text-primary shadow-card ring-1 ring-border">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Every manuscript deserves a good reply.</p>
      </aside>

      <section className="relative flex min-w-0 flex-col">
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-14 sm:px-8">
          <Suspense fallback={<Skeleton className="h-[560px] w-full max-w-md rounded-xl" />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
