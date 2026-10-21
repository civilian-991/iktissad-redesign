import * as Sentry from "@sentry/nextjs";

// Loaded by instrumentation.ts when NEXT_RUNTIME === "nodejs"
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.APP_ENV ?? "development",
  // Local `next dev` shares the production DSN; keep its errors out of Sentry.
  enabled: process.env.NODE_ENV === "production",

  sendDefaultPii: true,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.APP_ENV === "production" ? 0.1 : 1.0,

  // Attach local variable values to stack frames for better debugging
  includeLocalVariables: true,

  enableLogs: true,

  debug: process.env.APP_ENV !== "production",
});
