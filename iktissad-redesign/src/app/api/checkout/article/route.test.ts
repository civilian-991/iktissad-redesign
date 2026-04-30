import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────

const requireAuthMock = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
  unauthorizedResponse: () =>
    Response.json({ error: "Unauthorized" }, { status: 401 }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "00000000-0000-0000-0000-000000000001" } },
      }),
    },
  }),
}));

// Default admin mock — overridden per-test where needed via vi.mocked(...).mockReturnValueOnce
const articleRow = {
  id: "22222222-2222-2222-2222-222222222222",
  title: "Test Article",
  slug: "test-article",
  is_paywalled: true,
  article_price: 5,
};

const adminFromMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: adminFromMock }),
}));

vi.mock("@/lib/mpgs", () => ({
  createCheckoutSession: vi.fn().mockResolvedValue({
    sessionId: "SESS123",
    successIndicator: "OK",
  }),
  getMpgsCredentials: () => ({
    merchantId: "TEST",
    apiPassword: "x",
    webhookSecret: "y",
    payUrl: "https://test-gateway.example/pay",
    mode: "test",
  }),
}));

beforeEach(() => {
  requireAuthMock.mockReset();
  adminFromMock.mockReset();

  // Default: admin queries return our test article + 0 existing purchases + chainable insert
  adminFromMock.mockImplementation((table: string) => {
    if (table === "article_purchases") {
      // For the duplicate-check (count) and the final insert
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0 }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          onConflict: vi.fn().mockReturnValue({
            ignore: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    }
    if (table === "articles") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: articleRow }),
          }),
        }),
      };
    }
    return {};
  });
});

function postRequest(body: unknown | string) {
  return new NextRequest("http://localhost/api/checkout/article", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/checkout/article", () => {
  it("returns 401 when caller is unauthenticated", async () => {
    requireAuthMock.mockResolvedValue({ authenticated: false });
    const { POST } = await import("./route");
    const res = await POST(postRequest({ articleId: "11111111-1111-1111-1111-111111111111" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    requireAuthMock.mockResolvedValue({ authenticated: true });
    const { POST } = await import("./route");
    const res = await POST(postRequest("nope"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when articleId is not a UUID", async () => {
    requireAuthMock.mockResolvedValue({ authenticated: true });
    const { POST } = await import("./route");
    const res = await POST(postRequest({ articleId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });
});
