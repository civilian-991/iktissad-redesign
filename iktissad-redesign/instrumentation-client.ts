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

  debug: !isProd,
});

// Hook into App Router navigation transitions
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
