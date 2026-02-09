import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Protect admin routes (except the Stack Auth handler)
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Check for Stack Auth session cookie
    const hasSession = request.cookies.has("stack-session");

    if (!hasSession) {
      const signInUrl = new URL("/handler/sign-in", request.url);
      signInUrl.searchParams.set("after_auth_return_to", request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
