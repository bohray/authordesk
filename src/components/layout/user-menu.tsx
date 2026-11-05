"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/format";

/** Presentational user menu; data and logout come from the auth feature. */
export function UserMenu({
  name,
  email,
  meta,
  onLogout,
  isLoggingOut,
}: {
  name: string | null;
  email?: string;
  meta?: string;
  onLogout: () => void;
  isLoggingOut?: boolean;
}) {
  if (!name) return <Skeleton className="h-8 w-28 rounded-full" />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Account menu for ${name}`}
      >
        <Avatar size="sm">
          <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate font-medium lg:inline">{name}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5 py-1.5">
            <span className="block text-sm font-medium text-foreground">{name}</span>
            {email && <span className="block truncate font-normal">{email}</span>}
            {meta && <span className="block font-mono font-normal">{meta}</span>}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} disabled={isLoggingOut}>
          <LogOut aria-hidden />
          {isLoggingOut ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
