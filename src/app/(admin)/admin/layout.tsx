import { AppShell } from "@/components/layout/AppShell";
import { AdminNav } from "@/components/layout/AdminNav";
import { AccountMenu } from "@/features/auth/components/AccountMenu";
import { routes } from "@/constants/routes";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      scope="admin"
      homeHref={routes.admin.tickets}
      nav={<AdminNav />}
      // Agents care whether the queue is in sync; authors just see replies arrive.
      showLiveStatus
      userMenu={<AccountMenu />}
    >
      {children}
    </AppShell>
  );
}
