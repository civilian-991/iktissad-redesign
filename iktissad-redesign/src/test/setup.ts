// Vitest setup — fills env vars that route modules read at import time.
// Real values aren't needed; modules just need them defined to construct clients.

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.MPGS_MERCHANT_ID ??= "TEST123";
process.env.MPGS_API_PASSWORD ??= "test-password";
process.env.MPGS_WEBHOOK_SECRET ??= "test-webhook-secret";
process.env.MPGS_MODE ??= "test";
process.env.NEXT_PUBLIC_SITE_URL ??= "https://test.local";
