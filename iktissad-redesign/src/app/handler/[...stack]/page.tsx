"use client";

import { StackHandler } from "@stackframe/stack";
import { stackClient } from "@/stack";

export default function StackHandlerPage(props: { params: Promise<{ stack: string[] }> }) {
  if (!stackClient) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="text-center text-white/60 font-[family-name:var(--font-display)]">
          <p className="text-xl mb-2">Stack Auth not configured</p>
          <p className="text-sm">Please set NEXT_PUBLIC_STACK_PROJECT_ID and NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY in .env.local</p>
        </div>
      </div>
    );
  }

  return <StackHandler fullPage app={stackClient} params={props.params} />;
}
