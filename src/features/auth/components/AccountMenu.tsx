"use client";

import { UserMenu } from "@/components/layout/UserMenu";
import { useSession } from "@/features/auth/hooks/useSession";
import { useLogout } from "@/features/auth/hooks/useAuthMutations";

/** Session-aware user menu used in both portal shells. */
export function AccountMenu() {
  const { data: user } = useSession();
  const logout = useLogout();
  const meta =
    user?.role === "AUTHOR" && user.authorCode
      ? `Author code: ${user.authorCode}`
      : user?.role === "ADMIN"
        ? "Support team"
        : undefined;
  return (
    <UserMenu
      name={user?.name ?? null}
      email={user?.email}
      meta={meta}
      onLogout={() => logout.mutate()}
      isLoggingOut={logout.isPending || logout.isSuccess}
    />
  );
}
