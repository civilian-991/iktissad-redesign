'use client';

import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClient } from "@/stack";
import { TranslationProvider } from '@/lib/i18n';

export function Providers({ children }: { children: React.ReactNode }) {
  const content = (
    <TranslationProvider defaultLocale="ar">
      {children}
    </TranslationProvider>
  );

  if (stackClient) {
    return (
      <StackProvider app={stackClient}>
        <StackTheme>
          {content}
        </StackTheme>
      </StackProvider>
    );
  }

  return content;
}
