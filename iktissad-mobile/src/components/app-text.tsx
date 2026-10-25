import { Text, type TextProps } from 'react-native';

import { RIGHT } from '@/lib/rtl';
import { colors, fonts } from '@/theme';

type Variant = 'body' | 'title' | 'headline' | 'subhead' | 'caption' | 'label';

const variants: Record<Variant, { fontSize: number; lineHeight: number; fontFamily: string }> = {
  headline: { fontSize: 26, lineHeight: 38, fontFamily: fonts.extraBold },
  title: { fontSize: 18, lineHeight: 28, fontFamily: fonts.bold },
  subhead: { fontSize: 16, lineHeight: 26, fontFamily: fonts.medium },
  body: { fontSize: 18, lineHeight: 32, fontFamily: fonts.regular },
  caption: { fontSize: 13, lineHeight: 20, fontFamily: fonts.regular },
  label: { fontSize: 13, lineHeight: 18, fontFamily: fonts.bold },
};

export function AppText({
  variant = 'body',
  muted,
  style,
  ...props
}: TextProps & { variant?: Variant; muted?: boolean }) {
  return (
    <Text
      {...props}
      style={[
        variants[variant],
        { color: muted ? colors.secondaryLabel : colors.label, textAlign: RIGHT, writingDirection: 'rtl' },
        style,
      ]}
    />
  );
}
