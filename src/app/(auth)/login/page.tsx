import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { LoginShowcase } from "@/features/auth/components/LoginShowcase";
import { Skeleton } from "@/components/ui/Skeleton";
import { ThemeToggle } from "@/components/brand/ThemeToggle";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <LoginShowcase />
      <section className="relative flex min-w-0 flex-col">
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-14 sm:px-8">
          {/* LoginForm reads `?next` with useSearchParams, which needs a Suspense boundary. */}
          <Suspense fallback={<Skeleton className="h-[560px] w-full max-w-md rounded-xl" />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
