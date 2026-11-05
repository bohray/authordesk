import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/** The proxy redirects "/" to the role home; this is only a fallback. */
export default function Home() {
  redirect(ROUTES.login);
}
