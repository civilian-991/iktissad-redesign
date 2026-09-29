import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────
// The route reads cookies via createClient() and writes via createAdminClient().
// We stub both to avoid real Supabase calls.

const insertMock = vi.fn().mockResolvedValue({ error: null });
const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
/** The row a closing event looks up; null = no open read to fold into. */
let openRow: Record<string, unknown> | null = null;

// Chainable stand-in for the lookup: .select().eq().eq().gte().order().limit().maybeSingle()
function selectChain() {
  const chain = {
    eq: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: openRow, error: null }),
  };
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ insert: insertMock, select: selectChain, update: updateMock }),
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

// ── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  insertMock.mockClear();
  updateMock.mockClear();
  updateEqMock.mockClear();
  openRow = null;
});

async function importRoute() {
  return import("./route");
}

function postRequest(body: unknown | string) {
  return new NextRequest("http://localhost/api/track/article-read", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/track/article-read", () => {
  it("returns 400 on invalid JSON", async () => {
    const { POST } = await importRoute();
    const res = await POST(postRequest("not-json"));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 400 when articleId is missing", async () => {
    const { POST } = await importRoute();
    const res = await POST(postRequest({ sessionId: "anon-abc" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 400 when articleId is not a UUID", async () => {
    const { POST } = await importRoute();
    const res = await POST(postRequest({ articleId: "not-a-uuid", sessionId: "anon-abc" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("inserts a reading_session and returns ok=true on valid input", async () => {
    const { POST } = await importRoute();
    const res = await POST(
      postRequest({
        articleId: "550e8400-e29b-41d4-a716-446655440000",
        sessionId: "anon-xyz",
        timeOnPage: 12,
        scrollDepth: 80,
        readThrough: true,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledOnce();
    const insertedRow = insertMock.mock.calls[0][0];
    expect(insertedRow).toMatchObject({
      article_id: "550e8400-e29b-41d4-a716-446655440000",
      session_id: "anon-xyz",
      time_on_page: 12,
      scroll_depth: 80,
      read_through: true,
      user_id: null,
    });
  });

  it("folds a closing event into the open read instead of counting a second read", async () => {
    openRow = { id: "row-1", time_on_page: 0, scroll_depth: 10, read_through: false };
    const { POST } = await importRoute();
    const res = await POST(
      postRequest({
        articleId: "550e8400-e29b-41d4-a716-446655440000",
        sessionId: "anon-xyz",
        timeOnPage: 95,
        scrollDepth: 92,
        readThrough: true,
      })
    );
    expect(res.status).toBe(200);
    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith({ time_on_page: 95, scroll_depth: 92, read_through: true });
    expect(updateEqMock).toHaveBeenCalledWith("id", "row-1");
  });
});
