/**
 * Unit tests for the role-based authorization helper `requireRole`.
 *
 * The helper composes:
 *   1. `requireAuth(request?)` — establishes identity from the Supabase SSR
 *      cookie session (and optionally validates CSRF when a request is given).
 *   2. A direct lookup against `admin_roles` for the caller's `role`.
 *   3. Membership check against the caller-supplied `allowedRoles` list.
 *
 * We mock both Supabase client factories so the test runs without a real
 * Supabase instance. The mocks are stateful — see `mockState` — so each test
 * can dial in the exact session + role scenario it cares about.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock state — toggled per-test ──────────────────────────────────────────

const mockState: {
  sessionUser: { id: string } | null;
  adminRole: string | null;
} = {
  sessionUser: null,
  adminRole: null,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () =>
        mockState.sessionUser
          ? { data: { user: mockState.sessionUser }, error: null }
          : { data: { user: null }, error: new Error("no session") },
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            mockState.adminRole
              ? { data: { role: mockState.adminRole }, error: null }
              : { data: null, error: { message: "no row" } },
        }),
      }),
    }),
    auth: {
      // Used by the Bearer-token branch (not exercised in this suite).
      getUser: async () => ({ data: { user: null }, error: new Error("n/a") }),
    },
  }),
}));

// CSRF: always pass (we're not testing CSRF here, and no `request` is passed
// in these cases anyway, so this mock is a defensive default).
vi.mock("@/lib/csrf", () => ({
  validateCsrfToken: async () => true,
}));

// Import the helper AFTER the mocks are registered.
const { requireRole } = await import("./api-auth");

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockState.sessionUser = null;
  mockState.adminRole = null;
});

describe("requireRole", () => {
  it("returns { authenticated: false } when there is no session", async () => {
    mockState.sessionUser = null;
    mockState.adminRole = null;

    const result = await requireRole(undefined, ["super_admin", "editor"]);

    expect(result.authenticated).toBe(false);
    expect(result.role).toBeUndefined();
  });

  it("returns forbidden=true when the caller has a wrong role", async () => {
    mockState.sessionUser = { id: "user-finance-1" };
    mockState.adminRole = "finance";

    const result = await requireRole(undefined, ["super_admin", "editor"]);

    expect(result.authenticated).toBe(true);
    expect(result.userId).toBe("user-finance-1");
    expect(result.role).toBe("finance");
    expect(result.forbidden).toBe(true);
  });

  it("returns the role when the caller has an allowed role", async () => {
    mockState.sessionUser = { id: "user-editor-1" };
    mockState.adminRole = "editor";

    const result = await requireRole(undefined, ["super_admin", "editor"]);

    expect(result.authenticated).toBe(true);
    expect(result.userId).toBe("user-editor-1");
    expect(result.role).toBe("editor");
    expect(result.forbidden).toBeFalsy();
  });

  it("does NOT auto-bypass super_admin when it is not in allowedRoles", async () => {
    // super_admin is only authorized when callers explicitly include it.
    // This documents the contract: requireRole is allow-listed, not hierarchical.
    mockState.sessionUser = { id: "user-super-1" };
    mockState.adminRole = "super_admin";

    const restrictive = await requireRole(undefined, ["editor"]);
    expect(restrictive.authenticated).toBe(true);
    expect(restrictive.role).toBe("super_admin");
    expect(restrictive.forbidden).toBe(true);

    // When super_admin IS in the list, it is allowed.
    const permissive = await requireRole(undefined, ["super_admin", "editor"]);
    expect(permissive.authenticated).toBe(true);
    expect(permissive.role).toBe("super_admin");
    expect(permissive.forbidden).toBeFalsy();
  });

  it("returns forbidden=true when the session user has no admin_roles row", async () => {
    // Logged-in Supabase user without an admin_roles row should be rejected
    // with `forbidden=true`, not `authenticated=false` — the caller is real,
    // they just lack admin access. (Earlier prototype returned 401; this
    // expectation pins the post-Phase-N behavior.)
    mockState.sessionUser = { id: "user-noadmin-1" };
    mockState.adminRole = null;

    const result = await requireRole(undefined, ["super_admin", "editor"]);

    expect(result.authenticated).toBe(true);
    expect(result.userId).toBe("user-noadmin-1");
    expect(result.forbidden).toBe(true);
  });
});
