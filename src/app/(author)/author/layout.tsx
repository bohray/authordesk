import { AppShell } from "@/components/layout/AppShell";
import { AuthorNav } from "@/components/layout/AuthorNav";
import { AccountMenu } from "@/features/auth/components/AccountMenu";
import { routes } from "@/constants/routes";

export default function AuthorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      scope="author"
      homeHref={routes.author.books}
      nav={<AuthorNav />}
      userMenu={<AccountMenu />}
    >
      {children}
    </AppShell>
  );
}
