import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────

const verifyMock = vi.fn();

vi.mock("@/lib/mpgs", () => ({
  verifyMpgsWebhook: (...a: unknown[]) => verifyMock(...a),
  getMpgsCredentials: () => ({
    merchantId: "TEST",
    apiPassword: "x",
    webhookSecret: "test-webhook-secret",
    payUrl: "https://test/pay",
    mode: "test",
  }),
  normalizeVpcResponseCode: () => "success",
}));

// Admin client — we don't expect any DB calls in the rejection / unknown-type paths.
// For the success path we provide chainable noops so handlers don't throw.
const noopChain = () => {
  const handler: ProxyHandler<object> = {
    get(_t, _p) {
      return (..._args: unknown[]) => proxy;
    },
  };
  const proxy: object = new Proxy(
    Object.assign(() => proxy, { then: undefined }),
    handler,
  );
  return proxy;
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => noopChain() }),
}));

// ── Helpers ────────────────────────────────────────────────────────

beforeEach(() => {
  verifyMock.mockReset();
});

function webhookRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/webhooks/payment", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ── Tests ──────────────────────────────────────────────────────────

describe("POST /api/webhooks/payment", () => {
  it("rejects requests without a valid x-notification-secret (401)", async () => {
    verifyMock.mockReturnValue(false);
    const { POST } = await import("./route");
    const res = await POST(
      webhookRequest({ type: "PAYMENT", result: "SUCCESS" }, { "x-notification-secret": "wrong" }),
    );
    expect(res.status).toBe(401);
    expect(verifyMock).toHaveBeenCalledOnce();
  });

  it("returns 400 on invalid JSON body even when signature is valid", async () => {
    verifyMock.mockReturnValue(true);
    const { POST } = await import("./route");
    const res = await POST(
      webhookRequest("not-json", { "x-notification-secret": "test-webhook-secret" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 (received:true) on unrecognised event types — no retry storms", async () => {
    verifyMock.mockReturnValue(true);
    const { POST } = await import("./route");
    const res = await POST(
      webhookRequest(
        { type: "TOTALLY_UNKNOWN_EVENT" },
        { "x-notification-secret": "test-webhook-secret" },
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true });
  });
});
