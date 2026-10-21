import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NEXT_PUBLIC_APP_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",

  sendDefaultPii: true,

  // 100% in dev, 10% in production
  tracesSampleRate: isProd ? 0.1 : 1.0,

  // Session Replay: 10% of all sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [Sentry.replayIntegration()],

  // A request cancelled by the browser (navigation, back button, tab closed)
  // or by a third-party tag surfaces as an unhandled AbortError rejection.
  // Nothing failed for the reader, so drop those; aborts our own code awaits
  // are caught where they happen and never reach this handler.
  beforeSend(event) {
    const ex = event.exception?.values?.[0];
    const unhandledAbort =
      ex?.mechanism?.type === "auto.browser.global_handlers.onunhandledrejection" &&
      (ex.type === "AbortError" || /^AbortError\b|aborted/i.test(ex.value ?? ""));
    return unhandledAbort ? null : event;
  },

  debug: !isProd,
});

// Hook into App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
