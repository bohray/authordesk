"use client";

import { NavLinks } from "@/components/layout/NavLinks";
import { adminNavItems } from "@/constants/layout";

export function AdminNav() {
  return <NavLinks items={adminNavItems} label="Admin navigation" />;
}
