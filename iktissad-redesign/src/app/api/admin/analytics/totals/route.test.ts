import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────
// The route reads cookies via createClient() (for auth) and queries via
// createAdminClient(). We stub both to avoid real Supabase calls and to
// control the data each query returns.

type FromCall = {
  table: string;
  filters: Record<string, unknown>;
  selected: string | null;
  limited: number | null;
};

const fromCalls: FromCall[] = [];

// Data returned by the mocked admin client. Tests can override these per case.
let viewsResponse: { data: Array<{ views: number }>; count: number; error: null | { message: string } } = {
  data: [],
  count: 0,
  error: null,
};
let visitorsResponse: { data: Array<{ session_id: string }>; error: null | { message: string } } = {
  data: [],
  error: null,
};

// Mock returns a chainable builder. Each builder resolves (via `.then`) to
// the appropriate response when awaited (Promise.all in the route).
function makeBuilder(table: string) {
  const call: FromCall = { table, filters: {}, selected: null, limited: null };
  fromCalls.push(call);

  const response = () =>
    table === "articles" ? viewsResponse : visitorsResponse;

  const builder: any = {
    select(cols: string, _opts?: unknown) {
      call.selected = cols;
      return builder;
    },
    eq(key: string, value: unknown) {
      call.filters[`eq:${key}`] = value;
      return builder;
    },
    gte(key: string, value: unknown) {
      call.filters[`gte:${key}`] = value;
      return builder;
    },
    limit(n: number) {
      call.limited = n;
      return builder;
    },
    then(resolve: (r: unknown) => void, reject?: (e: unknown) => void) {
      try {
        resolve(response());
      } catch (e) {
        reject?.(e);
      }
    },
  };
  return builder;
}

const fromMock = vi.fn((table: string) => makeBuilder(table));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}));

// Auth mock — set `authedUser` to control whether requireRole() succeeds.
let authedUser: { id: string } | null = { id: "test-admin-id" };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: authedUser },
        error: authedUser ? null : { message: "no user" },
      }),
    },
  }),
}));

vi.mock("@/lib/api-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-auth")>("@/lib/api-auth");
  return {
    ...actual,
    requireRole: async () =>
      authedUser
        ? { authenticated: true, userId: authedUser.id, role: "super_admin" }
        : { authenticated: false },
  };
});

// ── Helpers ────────────────────────────────────────────────────────

beforeEach(() => {
  fromCalls.length = 0;
  fromMock.mockClear();
  authedUser = { id: "test-admin-id" };
  viewsResponse = { data: [], count: 0, error: null };
  visitorsResponse = { data: [], error: null };
});

async function importRoute() {
  return import("./route");
}

function getRequest(url = "http://localhost/api/admin/analytics/totals") {
  return new NextRequest(url, { method: "GET" });
}

// ── Tests ──────────────────────────────────────────────────────────

describe("GET /api/admin/analytics/totals", () => {
  it("returns 401 when the caller is not authenticated", async () => {
    authedUser = null;
    const { GET } = await importRoute();
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("aggregates totalViews, totalUniqueVisitors and totalArticles (all-time)", async () => {
    viewsResponse = {
      data: [{ views: 10 }, { views: 25 }, { views: 0 }, { views: 7 }],
      count: 4,
      error: null,
    };
    visitorsResponse = {
      data: [
        { session_id: "a" },
        { session_id: "b" },
        { session_id: "a" }, // duplicate -> deduped
        { session_id: "c" },
        { session_id: "" },  // empty -> ignored
      ],
      error: null,
    };

    const { GET } = await importRoute();
    const res = await GET(getRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual({
      totalViews: 42,
      totalUniqueVisitors: 3,
      totalArticles: 4,
      windowDays: null,
    });

    // Verifies the route queried both tables and did NOT apply a date window
    expect(fromCalls.find((c) => c.table === "articles")?.filters["gte:published_at"]).toBeUndefined();
    expect(fromCalls.find((c) => c.table === "article_reads")?.filters["gte:created_at"]).toBeUndefined();
  });

  it("applies a date window when ?window=7d is passed", async () => {
    viewsResponse = { data: [{ views: 5 }], count: 1, error: null };
    visitorsResponse = { data: [{ session_id: "s1" }], error: null };

    const { GET } = await importRoute();
    const res = await GET(getRequest("http://localhost/api/admin/analytics/totals?window=7d"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.windowDays).toBe(7);
    expect(body.data.totalViews).toBe(5);
    expect(body.data.totalUniqueVisitors).toBe(1);

    // Date filters were applied on both queries
    expect(fromCalls.find((c) => c.table === "articles")?.filters["gte:published_at"]).toBeTypeOf("string");
    expect(fromCalls.find((c) => c.table === "article_reads")?.filters["gte:created_at"]).toBeTypeOf("string");
  });

  it("falls back to window=all when window param is unknown", async () => {
    viewsResponse = { data: [], count: 0, error: null };

    const { GET } = await importRoute();
    const res = await GET(getRequest("http://localhost/api/admin/analytics/totals?window=banana"));
    const body = await res.json();
    expect(body.data.windowDays).toBeNull();
  });

  it("returns 500 when the underlying query errors", async () => {
    viewsResponse = { data: [], count: 0, error: { message: "db down" } };

    const { GET } = await importRoute();
    const res = await GET(getRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("db down");
  });
});
