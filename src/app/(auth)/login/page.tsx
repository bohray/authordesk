import { Suspense } from "react";
import type { Metadata } from "next";
import { BookMarked, Inbox, Sparkles } from "lucide-react";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { Skeleton } from "@/components/ui/Skeleton";
import { Wordmark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/brand/ThemeToggle";

export const metadata: Metadata = { title: "Sign in" };

const points = [
  { Icon: BookMarked, text: "Books, sales and royalties in one calm place" },
  { Icon: Sparkles, text: "Tickets triaged by AI, answered by real people" },
  { Icon: Inbox, text: "A live queue built for the operations team" },
] as const;

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/*
        Ruled-paper panel. `paper-texture` draws a rule every 28px from the top, so every
        size, line-height and gap below is a multiple of 28px (one "row") and blocks are
        stacked from the top (no justify-between / centering, whose offsets depend on the
        viewport height). That keeps each line of text sitting in its own ruled row.
      */}
      <aside className="paper-texture relative hidden flex-col overflow-hidden border-r px-10 py-[56px] lg:flex xl:px-14">
        <Wordmark
          className="h-[28px] gap-3"
          textClassName="text-2xl leading-[28px]"
          markClassName="size-[28px]"
        />
        <div className="mt-[168px] max-w-lg xl:mt-[224px]">
          <p className="text-xs leading-[28px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Author support portal
          </p>
          <p className="mt-[28px] font-heading text-4xl leading-[56px] font-semibold tracking-tight text-balance xl:text-5xl">
            Support for every author, <span className="text-primary italic">at scale.</span>
          </p>
          <ul className="mt-[56px] flex flex-col gap-[28px] text-sm leading-[28px] text-muted-foreground">
            {points.map(({ Icon, text }) => (
              <li key={text} className="flex h-[28px] items-center gap-3">
                <span className="flex size-[28px] shrink-0 items-center justify-center rounded-md bg-card text-primary shadow-card ring-1 ring-border">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-[112px] text-xs leading-[28px] text-muted-foreground">
            Every manuscript deserves a good reply.
          </p>
        </div>
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
