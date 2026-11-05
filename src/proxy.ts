import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/server/auth/jwt";
import { SESSION_COOKIE } from "@/shared/constants/roles";

/**
 * Page-level guard (Next 16 "proxy", formerly middleware). It only verifies the JWT,
 * with no DB access, and redirects. API routes are protected separately by `withApi`, so
 * security never depends on this file alone.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.JWT_SECRET ?? "";
  const session = token && secret ? await verifySession(token, secret) : null;

  const home = session?.role === "ADMIN" ? "/admin/tickets" : "/author/books";

  if (pathname === "/" || pathname === "/login") {
    if (session) return NextResponse.redirect(new URL(home, req.url));
    if (pathname === "/") return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL(home, req.url));
  }
  if (pathname.startsWith("/author") && session.role !== "AUTHOR") {
    return NextResponse.redirect(new URL(home, req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/author/:path*", "/admin/:path*"],
};
