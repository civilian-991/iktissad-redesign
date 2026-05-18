import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────

const postToTelegramMock = vi.fn();
const sgSendMock = vi.fn();
const insertLogMock = vi.fn();

vi.mock("@/lib/social-posting", () => ({
  postToTelegram: (...a: unknown[]) => postToTelegramMock(...a),
}));

vi.mock("@/lib/site-settings", () => ({
  getSiteSetting: vi.fn(async () => null),
}));

// SendGrid is dynamically imported inside the handler; intercept the import.
vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: (...a: unknown[]) => sgSendMock(...a),
  },
}));

/**
 * Programmable Supabase admin mock — every call to .from(table) returns a
 * chainable builder. For automation_rules we feed it pre-seeded enabled rules;
 * for social_accounts we return one Telegram account; for automation_runs we
 * record each insert into `insertLogMock`.
 */
const rulesStore: Record<string, unknown>[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string): any => {
      if (table === "automation_rules") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: rulesStore }),
            }),
          }),
        };
      }
      if (table === "social_accounts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: {
                        access_token: "tg-token-xyz",
                        account_name: "@iktissad_test",
                        active: true,
                      },
                    }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "automation_runs") {
        return {
          insert: (row: unknown) => {
            insertLogMock(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      // Fallback (admin_notifications, articles, ...)
      return {
        insert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      };
    },
  }),
}));

// Import AFTER mocks are registered
import { runAutomations } from "./engine";

beforeEach(() => {
  postToTelegramMock.mockReset();
  sgSendMock.mockReset();
  insertLogMock.mockReset();
  rulesStore.length = 0;
  process.env.SENDGRID_API_KEY = "SG.test.key";
});

describe("runAutomations — post_telegram", () => {
  it("dispatches a Telegram message using the article-published template", async () => {
    rulesStore.push({
      id: "rule-1",
      rule_key: "article_published_telegram",
      name: "TG",
      trigger_event: "article.published",
      action_type: "post_telegram",
      config: { template: "article-published" },
      enabled: true,
    });

    postToTelegramMock.mockResolvedValue({ platform: "telegram", status: "sent" });

    await runAutomations("article.published", {
      article: { title: "خبر هام", slug: "important-news", excerpt: "ملخص" },
    });

    expect(postToTelegramMock).toHaveBeenCalledTimes(1);
    const [token, text, chat] = postToTelegramMock.mock.calls[0];
    expect(token).toBe("tg-token-xyz");
    expect(chat).toBe("@iktissad_test");
    expect(text).toContain("خبر هام");
    expect(text).toContain("important-news");

    // automation_runs row persisted as success
    expect(insertLogMock).toHaveBeenCalledTimes(1);
    expect(insertLogMock.mock.calls[0][0]).toMatchObject({
      action: "post_telegram",
      status: "success",
      automation_id: "rule-1",
    });
  });

  it("returns failed (does not throw) when Telegram API errors", async () => {
    rulesStore.push({
      id: "rule-2",
      rule_key: "article_published_telegram",
      name: "TG",
      trigger_event: "article.published",
      action_type: "post_telegram",
      config: { template: "article-published" },
      enabled: true,
    });

    postToTelegramMock.mockResolvedValue({
      platform: "telegram",
      status: "failed",
      error: "Telegram API 400: bad chat",
    });

    await expect(
      runAutomations("article.published", {
        article: { title: "X", slug: "x" },
      })
    ).resolves.toBeUndefined();

    expect(insertLogMock.mock.calls[0][0]).toMatchObject({
      action: "post_telegram",
      status: "failed",
      error: "Telegram API 400: bad chat",
    });
  });
});

describe("runAutomations — send_welcome_email", () => {
  it("sends a SendGrid welcome email to the payload email", async () => {
    rulesStore.push({
      id: "rule-3",
      rule_key: "subscriber_welcome_email",
      name: "Welcome",
      trigger_event: "subscriber.created",
      action_type: "send_welcome_email",
      config: { from_name: "إكتساد" },
      enabled: true,
    });

    sgSendMock.mockResolvedValue([{ statusCode: 202 }]);

    await runAutomations("subscriber.created", {
      email: "user@example.com",
      subscriber: { name: "أحمد" },
    });

    expect(sgSendMock).toHaveBeenCalledTimes(1);
    const msg = sgSendMock.mock.calls[0][0];
    expect(msg.to).toBe("user@example.com");
    expect(msg.from.name).toBe("إكتساد");
    expect(msg.subject).toBe("أهلاً بك في إكتساد");
    expect(typeof msg.html).toBe("string");
    expect(msg.html).toContain("أحمد");

    expect(insertLogMock.mock.calls[0][0]).toMatchObject({
      action: "send_welcome_email",
      status: "success",
    });
  });

  it("no-ops (logs as skipped) when no recipient email is provided", async () => {
    rulesStore.push({
      id: "rule-4",
      rule_key: "subscriber_welcome_email",
      name: "Welcome",
      trigger_event: "subscriber.created",
      action_type: "send_welcome_email",
      config: {},
      enabled: true,
    });

    await runAutomations("subscriber.created", {});

    expect(sgSendMock).not.toHaveBeenCalled();
    expect(insertLogMock.mock.calls[0][0]).toMatchObject({
      action: "send_welcome_email",
      status: "skipped",
    });
  });
});
