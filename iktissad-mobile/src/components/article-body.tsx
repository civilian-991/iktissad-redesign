import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/app-text';
import type { Block, Run } from '@/lib/content';
import { brand, colors, fonts, MaxContentWidth, spacing } from '@/theme';
import { RIGHT } from '@/lib/rtl';
import { t } from '@/lib/strings';

/** Body text: right-aligned, right-to-left (see lib/rtl.ts). */
export const bodyAlign = { textAlign: RIGHT, writingDirection: 'rtl' } as const;

function Runs({ runs }: { runs: Run[] }) {
  return runs.map((r, i) => (
    <Text
      key={i}
      onPress={r.href ? () => WebBrowser.openBrowserAsync(r.href!) : undefined}
      style={[
        r.bold && { fontFamily: fonts.bold },
        r.italic && { fontStyle: 'italic' },
        r.href && { color: brand.blue, textDecorationLine: 'underline' },
      ]}>
      {r.text}
    </Text>
  ));
}

function BodyImage({ src, caption }: { src: string; caption?: string }) {
  const [ratio, setRatio] = useState(16 / 10);
  return (
    <View style={{ gap: spacing.xs, marginVertical: spacing.sm }}>
      <Image
        source={src}
        style={{ width: '100%', aspectRatio: ratio, borderRadius: 6, backgroundColor: colors.secondaryBackground }}
        contentFit="contain"
        transition={150}
        onLoad={(e) => {
          const { width, height } = e.source;
          if (width && height) setRatio(width / height);
        }}
      />
      {caption ? (
        <AppText variant="caption" muted>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  const align = bodyAlign;
  const { width } = useWindowDimensions();
  const pad = width > MaxContentWidth ? (width - MaxContentWidth) / 2 : spacing.md;

  return (
    <View style={{ paddingHorizontal: pad, gap: spacing.md }}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'paragraph':
            return (
              <AppText key={i} selectable style={align}>
                <Runs runs={b.runs} />
              </AppText>
            );
          case 'heading':
            return (
              <AppText key={i} variant="title" accessibilityRole="header" style={[align, { fontSize: 21, lineHeight: 32, marginTop: spacing.sm }]}>
                <Runs runs={b.runs} />
              </AppText>
            );
          case 'quote':
            return (
              <View
                key={i}
                style={{
                  borderStartWidth: 3,
                  borderStartColor: brand.gold,
                  paddingStart: spacing.md,
                  paddingVertical: spacing.xs,
                }}>
                <AppText selectable style={[align, { fontFamily: fonts.medium, fontSize: 20, lineHeight: 34 }]}>
                  <Runs runs={b.runs} />
                </AppText>
              </View>
            );
          case 'listItem':
            return (
              <View key={i} style={{ flexDirection: 'row', gap: spacing.sm }}>
                <AppText style={{ minWidth: 18 }}>{b.marker}</AppText>
                <AppText selectable style={[align, { flex: 1 }]}>
                  <Runs runs={b.runs} />
                </AppText>
              </View>
            );
          case 'image':
            return <BodyImage key={i} src={b.src} caption={b.caption} />;
          case 'embed':
            return (
              <Pressable
                key={i}
                onPress={() => WebBrowser.openBrowserAsync(b.url)}
                accessibilityRole="link"
                style={{
                  padding: spacing.md,
                  borderRadius: 10,
                  borderCurve: 'continuous',
                  backgroundColor: colors.secondaryBackground,
                }}>
                <AppText variant="label" style={{ color: brand.blue }}>
                  ▶ {t.common.openInBrowser}
                </AppText>
              </Pressable>
            );
        }
      })}
    </View>
  );
}
