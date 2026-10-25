import Constants from 'expo-constants';
import { Stack } from 'expo-router/stack';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Turnstile } from '@/components/turnstile';
import { api, SITE_URL } from '@/lib/api';
import { RIGHT } from '@/lib/rtl';
import { fill, t } from '@/lib/strings';
import { brand, colors, fonts, spacing } from '@/theme';

export function MoreScreen() {
  const links: { label: string; path: string }[] = [
    { label: t.more.about, path: '/about' },
    { label: t.more.contact, path: '/contact' },
    { label: t.more.privacy, path: '/privacy' },
    { label: t.more.terms, path: '/terms' },
    { label: t.more.website, path: '/' },
  ];

  return (
    <>
      <Stack.Screen options={{ title: t.more.title }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        <Card title={t.more.newsletter}>
          <NewsletterForm />
        </Card>

        <View style={{ borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.secondaryBackground, overflow: 'hidden' }}>
          {links.map((l, i) => (
            <Pressable
              key={l.path}
              accessibilityRole="link"
              onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}${l.path}`)}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.md - 2,
                borderTopWidth: i === 0 ? 0 : 0.5,
                borderTopColor: colors.separator,
                opacity: pressed ? 0.6 : 1,
              })}>
              <AppText variant="subhead">{l.label}</AppText>
            </Pressable>
          ))}
        </View>

        <AppText variant="caption" muted style={{ textAlign: 'center' }}>
          {fill(t.more.version, { v: Constants.expoConfig?.version ?? '' })}
        </AppText>
      </ScrollView>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" muted style={{ paddingHorizontal: spacing.xs }}>
        {title}
      </AppText>
      <View style={{ borderRadius: 14, borderCurve: 'continuous', backgroundColor: colors.secondaryBackground, padding: spacing.md, gap: spacing.md }}>
        {children}
      </View>
    </View>
  );
}

type FormState = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done' } | { kind: 'error'; message: string };

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);
  const [state, setState] = useState<FormState>({ kind: 'idle' });

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const sending = state.kind === 'sending';

  const submit = async () => {
    if (sending) return;
    if (!valid) {
      setState({ kind: 'error', message: t.more.invalidEmail });
      return;
    }
    if (!token) return;
    setState({ kind: 'sending' });
    try {
      await api.subscribeNewsletter(email.trim(), token);
      setState({ kind: 'done' });
    } catch {
      // Keep the email so the reader can retry; the token was spent.
      setState({ kind: 'error', message: t.more.subscribeError });
    } finally {
      setToken(null);
      setWidgetKey((k) => k + 1);
    }
  };

  if (state.kind === 'done') {
    return <AppText variant="subhead">{t.more.subscribed}</AppText>;
  }

  return (
    <>
      <AppText variant="subhead" muted>
        {t.more.newsletterBody}
      </AppText>
      <TextInput
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (state.kind === 'error') setState({ kind: 'idle' });
        }}
        placeholder={t.more.email}
        placeholderTextColor={colors.tertiaryLabel}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={submit}
        editable={!sending}
        accessibilityLabel={t.more.email}
        style={{
          fontFamily: fonts.regular,
          fontSize: 17,
          color: colors.label,
          backgroundColor: colors.background,
          borderRadius: 10,
          borderCurve: 'continuous',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 4,
          // Email addresses are always LTR, even in the Arabic UI.
          writingDirection: 'ltr',
          textAlign: RIGHT,
        }}
      />
      <Turnstile
        key={widgetKey}
        language="ar"
        theme="light"
        onToken={setToken}
        onExpire={() => setToken(null)}
      />
      {state.kind === 'error' ? (
        <AppText variant="caption" selectable style={{ color: '#C0392B' }}>
          {state.message}
        </AppText>
      ) : null}
      <Pressable
        onPress={submit}
        disabled={sending || !token}
        accessibilityRole="button"
        accessibilityState={{ disabled: sending || !token }}
        style={({ pressed }) => ({
          alignItems: 'center',
          paddingVertical: spacing.sm + 4,
          borderRadius: 10,
          borderCurve: 'continuous',
          backgroundColor: brand.gold,
          opacity: sending || !token ? 0.5 : pressed ? 0.85 : 1,
        })}>
        {sending ? (
          <ActivityIndicator color="white" />
        ) : (
          <AppText variant="label" style={{ color: 'white', fontSize: 16 }}>
            {t.more.subscribe}
          </AppText>
        )}
      </Pressable>
    </>
  );
}
