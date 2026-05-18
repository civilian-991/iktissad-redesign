import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────

const requireAuthMock = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => requireAuthMock(),
  unauthorizedResponse: () =>
    Response.json({ error: "Unauthorized" }, { status: 401 }),
}));

// SendGrid — dynamic-imported in the route. We mock the module.
const sendMultipleMock = vi.fn();
const setApiKeyMock = vi.fn();
vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: (...a: unknown[]) => setApiKeyMock(...a),
    sendMultiple: (...a: unknown[]) => sendMultipleMock(...a),
  },
}));

// Admin client — capture writes so we can assert what was persisted.
type Update = Record<string, unknown>;
const capturedUpdates: Update[] = [];

const NEWSLETTER_ID = "11111111-1111-1111-1111-111111111111";

interface FakeRow {
  id: string;
  status: string;
  segment: string;
  subject: string;
  blocks: unknown[];
  sender_name: string;
  sent_at: string | null;
  recipient_count: number | null;
  sent_count: number;
  failed_count: number;
  open_count: number;
  click_count: number;
  preview_text: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  title: string;
}

const baseRow = (): FakeRow => ({
  id: NEWSLETTER_ID,
  status: "draft",
  segment: "all",
  subject: "Hello",
  blocks: [],
  sender_name: "إكتساد",
  sent_at: null,
  recipient_count: null,
  sent_count: 0,
  failed_count: 0,
  open_count: 0,
  click_count: 0,
  preview_text: null,
  created_by: null,
  created_at: "2026-05-18T00:00:00Z",
  updated_at: "2026-05-18T00:00:00Z",
  title: "T",
});

// `subscribers` (premium segment) — left empty; we only test the `all` path.
const newsletterSubscribers: { email: string }[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "newsletters") {
        // Two read paths: select("id,status,segment") and select("*"), both .eq().single()
        return {
          select: (_cols: string) => ({
            eq: (_col: string, _val: string) => ({
              single: async () => ({ data: baseRow(), error: null }),
            }),
          }),
          // update().eq().select("*").single()
          update: (patch: Update) => {
            capturedUpdates.push(patch);
            return {
              eq: (_col: string, _val: string) => ({
                select: (_c: string) => ({
                  single: async () => {
                    const row = { ...baseRow(), ...patch };
                    return { data: row, error: null };
                  },
                }),
              }),
            };
          },
        };
      }
      if (table === "newsletter_subscribers") {
        return {
          select: (_cols: string) => ({
            eq: async (_col: string, _val: string) => ({
              data: newsletterSubscribers,
              error: null,
            }),
          }),
        };
      }
      if (table === "subscribers") {
        return {
          select: (_cols: string) => ({
            eq: async (_col: string, _val: string) => ({ data: [], error: null }),
          }),
        };
      }
      return {};
    },
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────

function postRequest() {
  return new NextRequest(
    `http://localhost/api/newsletters/${NEWSLETTER_ID}/send`,
    { method: "POST" }
  );
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  requireAuthMock.mockReset();
  sendMultipleMock.mockReset();
  setApiKeyMock.mockReset();
  capturedUpdates.length = 0;
  newsletterSubscribers.length = 0;

  requireAuthMock.mockResolvedValue({ authenticated: true });
  process.env.SENDGRID_API_KEY = "SG.fake";
  process.env.SENDGRID_FROM_EMAIL = "newsletter@iktissad.com";
});

// ── Tests ──────────────────────────────────────────────────────────

describe("POST /api/newsletters/[id]/send", () => {
  it("success path: marks status='sent' with sent_count == recipients", async () => {
    // 2500 recipients → 3 batches of 1000/1000/500
    for (let i = 0; i < 2500; i++) {
      newsletterSubscribers.push({ email: `user${i}@example.com` });
    }
    sendMultipleMock.mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const res = await POST(postRequest(), paramsFor(NEWSLETTER_ID));

    expect(res.status).toBe(200);
    expect(sendMultipleMock).toHaveBeenCalledTimes(3);

    // Exactly one update — and it happens AFTER SendGrid (so any throw can't
    // leave us "sent" with 0 recipients).
    expect(capturedUpdates).toHaveLength(1);
    const patch = capturedUpdates[0];
    expect(patch.status).toBe("sent");
    expect(patch.sent_count).toBe(2500);
    expect(patch.failed_count).toBe(0);
    expect(patch.recipient_count).toBe(2500);

    const body = await res.json();
    expect(body.data.status).toBe("sent");
    expect(body.data.sentCount).toBe(2500);
    expect(body.data.failedCount).toBe(0);
  });

  it("total failure: status='failed', no false positive 'sent'", async () => {
    for (let i = 0; i < 1500; i++) {
      newsletterSubscribers.push({ email: `user${i}@example.com` });
    }
    const err = Object.assign(new Error("Boom"), { code: 503 });
    sendMultipleMock.mockRejectedValue(err);

    const { POST } = await import("./route");
    const res = await POST(postRequest(), paramsFor(NEWSLETTER_ID));

    expect(res.status).toBe(500);
    expect(sendMultipleMock).toHaveBeenCalledTimes(2); // 1000 + 500

    expect(capturedUpdates).toHaveLength(1);
    const patch = capturedUpdates[0];
    expect(patch.status).toBe("failed");
    expect(patch.sent_count).toBe(0);
    expect(patch.failed_count).toBe(1500);

    const body = await res.json();
    expect(body.error).toMatch(/503|SENDGRID_ERROR/);
  });

  it("partial: status='partial' with split sent/failed counts", async () => {
    // 2000 recipients → 2 batches. First succeeds, second throws.
    for (let i = 0; i < 2000; i++) {
      newsletterSubscribers.push({ email: `user${i}@example.com` });
    }
    sendMultipleMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Second batch boom"));

    const { POST } = await import("./route");
    const res = await POST(postRequest(), paramsFor(NEWSLETTER_ID));

    // Partial is not a hard failure — return 200 with the partial-state row.
    expect(res.status).toBe(200);
    expect(sendMultipleMock).toHaveBeenCalledTimes(2);

    expect(capturedUpdates).toHaveLength(1);
    const patch = capturedUpdates[0];
    expect(patch.status).toBe("partial");
    expect(patch.sent_count).toBe(1000);
    expect(patch.failed_count).toBe(1000);
    expect(patch.recipient_count).toBe(2000);
  });

  it("returns 401 when unauthenticated", async () => {
    requireAuthMock.mockResolvedValueOnce({ authenticated: false });
    const { POST } = await import("./route");
    const res = await POST(postRequest(), paramsFor(NEWSLETTER_ID));
    expect(res.status).toBe(401);
    expect(capturedUpdates).toHaveLength(0);
  });
});
