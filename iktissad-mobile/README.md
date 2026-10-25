# الاقتصاد والأعمال — mobile app

iOS + Android reader app for iktissad.com, built with Expo (SDK 58) and Expo Router.
It reads the website's public API (`EXPO_PUBLIC_API_URL`), so there is no separate backend.

**v1 scope:** home feed, sections, article reader, search, magazine archive (all
`aiwa` issues, page-by-page), newsletter signup. Arabic only, always right-to-left.
Reading is free — no login, no paywall, no in-app purchases.

## Run it

```bash
npm install
npx expo run:ios        # native dev build on the iOS simulator (needs Xcode)
npx expo run:android    # needs Android Studio
```

Quick preview on a phone: `npx expo start --go` and scan with Expo Go. Expo Go
can't force native RTL, so there the tab bar and system controls keep the
phone's order; the screens themselves are still right-to-left.

## How it fits together

| Path | What |
|---|---|
| `src/app/` | Routes only. `(tabs)/` holds the five tabs; `article/`, `section/`, `issue/` are pushed over them. |
| `src/screens/` | Screen bodies. |
| `src/lib/api.ts` | Every API call. List calls send `fields=card` so responses omit article bodies. |
| `src/lib/content.ts` | Turns article bodies (TipTap JSON for new articles, HTML for the ~34k migrated ones) into native blocks. No WebView. |
| `src/lib/rtl.ts` | Always RTL: native via `forcesRTL` in app.json for real builds, `direction: 'rtl'` on every screen for Expo Go. All UI text is in `src/lib/strings.ts`. |
| `src/components/turnstile.tsx` | Cloudflare Turnstile in a WebView with `baseUrl` = the site, so newsletter signups pass the same bot check as the website. |

Dates use Western digits in Arabic (`ar-u-nu-latn`), matching the site.

## Website changes this app relies on

- `?fields=card` on `/api/articles`, `/api/sections/[slug]`, `/api/search` and
  `/api/magazines` (`iktissad-redesign/src/lib/articles/card.ts`). Without it the app
  still works, but a 20-item list is ~450 KB instead of ~20 KB.

## Releasing

1. Company accounts: Apple Developer Program (organisation, needs a D-U-N-S number)
   and Google Play Console.
2. `npx eas-cli@latest init` to link an EAS project, then
   `npx eas-cli@latest build --platform all` and `npx eas-cli@latest submit`.
3. Store listing: screenshots, Arabic + English descriptions, privacy policy URL
   (`https://www.iktissad.com/privacy`). The app collects only an email address,
   and only when someone subscribes to the newsletter.
4. Replace the 1024px icon (`assets/images/icon.png` is upscaled from the site's
   512px PWA icon) with a full-resolution export before submitting.
