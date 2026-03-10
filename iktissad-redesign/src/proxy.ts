import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// ─── RBAC: routes that require specific roles ─────────────────────────────────
// Routes NOT listed here are accessible to ALL authenticated admins.
const RBAC_MAP: Record<string, string[]> = {
  "/admin/subscribers": ["super_admin", "finance"],
  "/admin/revenue": ["super_admin", "finance"],
  "/admin/promo-codes": ["super_admin", "finance"],
  "/admin/users": ["super_admin"],
  "/admin/settings": ["super_admin"],
  "/admin/audit-log": ["super_admin"],
  "/admin/advertisers": ["super_admin", "advertiser_manager"],
  "/admin/ads": ["super_admin", "advertiser_manager"],
  "/admin/articles": ["super_admin", "editor", "writer"],
  "/admin/magazines": ["super_admin", "editor"],
  "/admin/comments": ["super_admin", "editor"],
  "/admin/reading-analytics": ["super_admin", "editor", "finance"],
};

// Helper: find the most-specific matching RBAC entry for a pathname
function getRbacRoles(pathname: string): string[] | null {
  // Sort keys by length descending so more specific paths match first
  const keys = Object.keys(RBAC_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (pathname === key || pathname.startsWith(key + "/")) {
      return RBAC_MAP[key];
    }
  }
  return null; // no restriction
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  // Create Supabase client that can read/write cookies to keep session alive
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (important for keeping session alive across requests)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─── Admin route protection ───────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // ─── RBAC check ───────────────────────────────────────────────────────
    const requiredRoles = getRbacRoles(pathname);
    if (requiredRoles !== null) {
      const { data: roleRow } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const userRole = (roleRow as { role: string } | null)?.role ?? null;

      // super_admin always bypasses RBAC restrictions
      if (userRole !== "super_admin") {
        if (!userRole || !requiredRoles.includes(userRole)) {
          return NextResponse.json(
            {
              error: "غير مصرح",
              message: "ليس لديك صلاحية للوصول إلى هذه الصفحة",
            },
            { status: 403 }
          );
        }
      }
    }
  }

  // ─── Paywall: /magazine/[issueId]/reader and /magazine/[issueId]/read ──────
  const paywallPattern = /^\/magazine\/[^/]+\/(reader|read)(\/.*)?$/;

  if (paywallPattern.test(pathname)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Check active/trialing subscription by email
    const { data: subscriber } = await supabase
      .from("subscribers")
      .select("status")
      .eq("email", user.email!)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (!subscriber) {
      const url = request.nextUrl.clone();
      url.pathname = "/subscribe";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/magazine/:issueId/reader",
    "/magazine/:issueId/reader/:path*",
    "/magazine/:issueId/read",
    "/magazine/:issueId/read/:path*",
  ],
};
