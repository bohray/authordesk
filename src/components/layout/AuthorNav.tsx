"use client";

import { NavLinks } from "@/components/layout/NavLinks";
import { authorNavItems } from "@/constants/layout";

export function AuthorNav() {
  return <NavLinks items={authorNavItems} label="Author navigation" />;
}
