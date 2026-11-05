export const userRoles = ["AUTHOR", "ADMIN"] as const;
export type Role = (typeof userRoles)[number];

export const sessionCookie = "ad_session";
