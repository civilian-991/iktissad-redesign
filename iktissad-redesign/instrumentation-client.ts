import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NEXT_PUBLIC_APP_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  // Local `next dev` shares the production DSN; keep its errors out of Sentry.
  enabled: process.env.NODE_ENV === "production",

  sendDefaultPii: true,

  // 100% in dev, 10% in production
  tracesSampleRate: isProd ? 0.1 : 1.0,

  // Session Replay: 10% of all sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [Sentry.replayIntegration()],

  // Noise from outside our code, seen in production:
  ignoreErrors: [
    // Outlook/Microsoft link scanners pre-fetching article links.
    /Object Not Found Matching Id:\d+, MethodName:/,
    // Android apps that inject scripts into their in-app WebView.
    /Java bridge method invocation error/,
    /Java object is gone/,
    // Browser extensions.
    /reader\.self/,
    // React Server Components stream cut off when the reader navigates away.
    /^Connection closed\.?$/,
  ],
  // Google ad/measurement scripts throw their own errors.
  denyUrls: [/\/pagead\//, /googlesyndication\.com/, /googletagmanager\.com/, /google-analytics\.com/],

  // A request cancelled by the browser (navigation, back button, tab closed)
  // or by a third-party tag surfaces as an unhandled AbortError rejection.
  // Nothing failed for the reader, so drop those; aborts our own code awaits
  // are caught where they happen and never reach this handler.
  beforeSend(event) {
    const ex = event.exception?.values?.[0];
    const unhandledAbort =
      ex?.mechanism?.type === "auto.browser.global_handlers.onunhandledrejection" &&
      (ex.type === "AbortError" || /^AbortError\b|aborted/i.test(ex.value ?? ""));
    if (unhandledAbort) return null;
    // Scripts injected by Android downloader apps (SnapTube and similar).
    const injected = ex?.stacktrace?.frames?.some((f) =>
      /SnapTube|jsReceiveMessages|needInjectCss/.test(f.function ?? "")
    );
    return injected ? null : event;
  },

  debug: !isProd,
});

// Hook into App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
