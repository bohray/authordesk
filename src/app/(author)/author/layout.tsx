import { AppShell } from "@/components/layout/app-shell";
import { AuthorNav, NewTicketButton } from "@/components/layout/author-nav";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { ROUTES } from "@/constants/routes";

export default function AuthorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      scope="author"
      homeHref={ROUTES.author.books}
      nav={<AuthorNav />}
      actions={<NewTicketButton />}
      userMenu={<AccountMenu />}
    >
      {children}
    </AppShell>
  );
}
