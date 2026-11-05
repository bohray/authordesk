"use client";

import { UserMenu } from "@/components/layout/UserMenu";
import { useSession } from "@/features/auth/hooks/useSession";
import { useLogout } from "@/features/auth/hooks/useAuthMutations";
import { authMessages } from "@/constants/auth";
import type { SessionUserDTO } from "@/shared/types/dto";

/** Secondary line in the menu: the author's code, or the support-team label for admins. */
function accountMeta(user: SessionUserDTO | undefined): string | undefined {
  if (!user) return undefined;
  if (user.role === "ADMIN") return authMessages.supportTeamMeta;
  return user.authorCode ? authMessages.authorCodeMeta(user.authorCode) : undefined;
}

/** Session-aware user menu used in both portal shells. */
export function AccountMenu() {
  const { data: user } = useSession();
  const logout = useLogout();
  const handleLogout = () => logout.mutate();

  return (
    <UserMenu
      name={user?.name ?? null}
      email={user?.email}
      meta={accountMeta(user)}
      onLogout={handleLogout}
      // Stay "signing out" after success: the full-page redirect is still in flight.
      isLoggingOut={logout.isPending || logout.isSuccess}
    />
  );
}
