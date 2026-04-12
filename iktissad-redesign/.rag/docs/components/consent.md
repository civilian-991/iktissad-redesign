# Components: Cookie Consent & Conditional Scripts

---

## `CookieConsent` (`src/components/CookieConsent.tsx`)

Full-screen cookie banner with a "Customize" panel for per-category consent. Shown on first visit; re-shown if consent has not been saved.

### Consent categories

| Category | Key | Always on? |
|----------|-----|-----------|
| Necessary | `necessary` | Yes (forced true) |
| Analytics (GA4) | `analytics` | No |
| Advertising (GAM) | `advertising` | No |

### `CookiePreferences` interface

```ts
export interface CookiePreferences {
  necessary: boolean;  // always true
  analytics: boolean;
  advertising: boolean;
}
```

### Persistence

Stored in `localStorage` under key `cookie-preferences` as JSON.

### Helper export

```ts
export function getConsentPreferences(): CookiePreferences | null
```
Returns the saved preferences or `null` if not set.

### Events dispatched

When the user clicks "Accept All" or "Save Preferences", dispatches a `CustomEvent`:

```ts
window.dispatchEvent(new CustomEvent('cookie-consent-saved', {
  detail: CookiePreferences
}));
```

---

## `ConsentScripts` (`src/components/ConsentScripts.tsx`)

Client component that conditionally loads third-party scripts based on cookie consent. Receives `nonce`, `gaMeasurementId`, and `gamNetworkCode` as props.

### Behavior

1. On mount: reads `getConsentPreferences()` from localStorage.
2. Listens for `cookie-consent-saved` CustomEvent for preference updates.
3. Loads GA4 scripts (`gtag.js`) only if `prefs.analytics === true`.
4. Loads GAM scripts (`googletag`) only if `prefs.advertising === true`.
5. All `<Script>` tags receive the `nonce` prop for CSP compatibility.

### Used in

`src/app/layout.tsx` — replaces the previously hardcoded unconditional GA/GAM `<Script>` blocks.

```tsx
// layout.tsx
const nonce = (await headers()).get("x-nonce") ?? undefined;
<ConsentScripts
  nonce={nonce}
  gaMeasurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
  gamNetworkCode={process.env.NEXT_PUBLIC_GAM_NETWORK_CODE}
/>
```
