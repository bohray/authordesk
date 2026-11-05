/**
 * Sign-in UI constants: demo accounts, form field config, role display and login-page copy.
 */
import { BookMarked, Inbox, Sparkles, type LucideIcon } from "lucide-react";
import type { Role } from "@/shared/constants/roles";
import type { LoginInput } from "@/shared/schemas/auth.schema";

export interface DemoAccount {
  email: string;
  password: string;
  role: Role;
  label: string;
  note: string;
}

const demoAuthorPassword = "Author@123";
const demoAdminPassword = "Admin@123";

/** Seeded accounts shown on the login page; each one demonstrates a different edge case. */
export const demoAccounts: DemoAccount[] = [
  {
    email: "priya.sharma@email.com",
    password: demoAuthorPassword,
    role: "AUTHOR",
    label: "Priya Sharma",
    note: "Author with several live books",
  },
  {
    email: "kavita.deshmukh@email.com",
    password: demoAuthorPassword,
    role: "AUTHOR",
    label: "Kavita Deshmukh",
    note: "Book in production + royalty below payout threshold",
  },
  {
    email: "ananya.reddy@email.com",
    password: demoAuthorPassword,
    role: "AUTHOR",
    label: "Ananya Reddy",
    note: "Author who has never been paid",
  },
  {
    email: "admin@authordesk.dev",
    password: demoAdminPassword,
    role: "ADMIN",
    label: "Aisha Verma",
    note: "Ticket queue, AI drafts, dashboard",
  },
];

export const roleLabels = {
  AUTHOR: "Author",
  ADMIN: "Admin",
} as const satisfies Record<Role, string>;

/** Path prefix of each role's portal; a post-login `next` redirect must stay inside it. */
export const portalPathPrefixes = {
  AUTHOR: "/author",
  ADMIN: "/admin",
} as const satisfies Record<Role, string>;

/** Login form inputs, rendered with one `.map()`. Also the fields server errors are mapped onto. */
export const loginFields: {
  name: keyof LoginInput;
  label: string;
  type: "email" | "password";
  autoComplete: string;
  placeholder?: string;
}[] = [
  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@example.com" },
  { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
];

/** Selling points on the login page's ruled-paper panel. */
export const loginHighlights: { icon: LucideIcon; text: string }[] = [
  { icon: BookMarked, text: "Books, sales and royalties in one calm place" },
  { icon: Sparkles, text: "Tickets triaged by AI, answered by real people" },
  { icon: Inbox, text: "A live queue built for the operations team" },
];

export const authMessages = {
  signInFailedTitle: "Couldn't sign you in",
  signOutFailed: "Couldn't sign out. Please try again.",
  supportTeamMeta: "Support team",
  authorCodeMeta: (code: string) => `Author code: ${code}`,
} as const;
