import { AppShell } from "@/components/layout/app-shell";
import { AdminNav } from "@/components/layout/admin-nav";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { ROUTES } from "@/constants/routes";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      scope="admin"
      homeHref={ROUTES.admin.tickets}
      nav={<AdminNav />}
      userMenu={<AccountMenu />}
    >
      {children}
    </AppShell>
  );
}
