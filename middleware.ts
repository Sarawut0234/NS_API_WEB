import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

const SESSION_COOKIE = "ns_system_session";

const protectedPrefixes = ["/dashboard", "/profile", "/admin", "/redeem"];
const authPages = new Set(["/login", "/register"]);

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const baseUrl = env.appBaseUrl.replace(/\/+$/, "");

  if (pathname === "/") {
    const target = hasSession ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(`${baseUrl}${target}`));
  }

  if (pathname === "/register") {
    return NextResponse.redirect(new URL(`${baseUrl}/login`));
  }

  if (!hasSession && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL(`${baseUrl}/login`));
  }

  if (hasSession && authPages.has(pathname)) {
    return NextResponse.redirect(new URL(`${baseUrl}/dashboard`));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
