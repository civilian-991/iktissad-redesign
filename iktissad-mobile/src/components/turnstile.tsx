import { WebView } from 'react-native-webview';

import { SITE_URL } from '@/lib/api';

const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? '';

/**
 * Cloudflare Turnstile, the same bot check the website's newsletter form uses.
 * The widget runs in a WebView whose origin is the site (baseUrl), so the
 * site key's hostname allow-list accepts it. Tokens are single-use: remount
 * (change `key`) after each submit.
 */
export function Turnstile({
  onToken,
  onExpire,
  language,
  theme,
}: {
  onToken: (token: string) => void;
  onExpire: () => void;
  language: 'ar';
  theme: 'light';
}) {
  const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=boot&render=explicit" async defer></script>
<style>html,body{margin:0;padding:0;background:transparent;display:flex;justify-content:center}</style>
</head><body><div id="w"></div><script>
function send(type, token){ window.ReactNativeWebView.postMessage(JSON.stringify({type, token})); }
function boot(){ turnstile.render('#w', {
  sitekey: ${JSON.stringify(SITE_KEY)}, language: ${JSON.stringify(language)}, theme: ${JSON.stringify(theme)},
  size: 'flexible',
  callback: function(t){ send('token', t); },
  'expired-callback': function(){ send('expired'); },
  'error-callback': function(){ send('expired'); }
}); }
</script></body></html>`;

  return (
    <WebView
      source={{ html, baseUrl: SITE_URL }}
      originWhitelist={['*']}
      style={{ height: 70, backgroundColor: 'transparent' }}
      scrollEnabled={false}
      onMessage={(e) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data) as { type: string; token?: string };
          if (msg.type === 'token' && msg.token) onToken(msg.token);
          else onExpire();
        } catch {}
      }}
    />
  );
}
