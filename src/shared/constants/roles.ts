export const ROLES = ["AUTHOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const SESSION_COOKIE = "ad_session";
