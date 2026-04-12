# Security Policy — Al Iktissad Wal Aamal

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (`main` branch) | ✅ Yes |
| Older releases | ❌ No |

Only the current production version receives security patches.

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Report security issues by emailing **security@iktissadonline.com** with:

1. A description of the vulnerability and its potential impact
2. Steps to reproduce (proof-of-concept code if possible)
3. Any suggested mitigations you have identified

You will receive an acknowledgement within **48 hours** and a status update within **7 days**.

## Disclosure Policy

- We follow [Coordinated Vulnerability Disclosure](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html)
- Please give us **90 days** to patch before any public disclosure
- We will credit researchers in release notes unless anonymity is requested

## Scope

| In Scope | Out of Scope |
|----------|--------------|
| `iktissadonline.com` and all subdomains | Third-party services (Supabase, Vercel, etc.) |
| Admin CMS (`/admin`) | Social engineering attacks |
| Public API (`/api`) | Physical security |
| Authentication flows | Issues in dependencies not directly exploitable |

## Security Controls in Place

- **CSP**: Content-Security-Policy with nonce-based script allowlisting (`src/proxy.ts`)
- **HSTS**: Strict-Transport-Security enforced for 1 year including subdomains
- **CSRF**: Double-submit cookie pattern on all mutation endpoints (`src/lib/csrf.ts`)
- **Rate limiting**: Sliding-window per-IP limits on all public and authenticated routes (`src/lib/rate-limit.ts`)
- **2FA**: TOTP-based two-factor authentication available for all admin accounts
- **Auth**: Supabase Auth with SSR cookie-based sessions (SameSite=Lax)
- **Bot protection**: Cloudflare Turnstile on login and newsletter signup
- **Dependency scanning**: `npm audit` runs on every CI push and weekly via GitHub Actions

## Dependency Scanning

Run locally:

```bash
cd iktissad-redesign
npm audit              # full report
npm audit --fix        # auto-fix where safe
npm audit --audit-level=high  # fail only on high/critical
```

The CI pipeline (`.github/workflows/security.yml`) runs `npm audit --audit-level=high` on every push to `main` and weekly on Mondays.
