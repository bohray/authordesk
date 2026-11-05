"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { defaultTheme, themeOptions } from "@/constants/layout";

const noopSubscribe = () => () => {};

/** True only after hydration, so the icon never mismatches the server render. */
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Light / Dark / System picker (next-themes). */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  // Before hydration the theme is unknown, so render the server's defaults to avoid a mismatch.
  const current = mounted ? (theme ?? defaultTheme) : defaultTheme;
  const TriggerIcon = mounted && resolvedTheme === "dark" ? Moon : Sun;
  const handleThemeChange = (value: unknown) => setTheme(String(value));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-muted-foreground hover:text-foreground",
          className,
        )}
        aria-label="Change colour theme"
      >
        <TriggerIcon aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={current} onValueChange={handleThemeChange}>
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={value} value={value}>
                <Icon aria-hidden />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
