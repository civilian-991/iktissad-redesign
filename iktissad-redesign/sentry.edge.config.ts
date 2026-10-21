import * as Sentry from "@sentry/nextjs";

// Loaded by instrumentation.ts when NEXT_RUNTIME === "edge"
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.APP_ENV ?? "development",
  // Local `next dev` shares the production DSN; keep its errors out of Sentry.
  enabled: process.env.NODE_ENV === "production",

  sendDefaultPii: true,

  tracesSampleRate: process.env.APP_ENV === "production" ? 0.1 : 1.0,

  enableLogs: true,

  debug: process.env.APP_ENV !== "production",
});
