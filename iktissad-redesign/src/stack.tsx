"use client";

import "client-only";
import { StackClientApp } from "@stackframe/stack";

const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
const publishableClientKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;

export const stackClient =
  projectId && publishableClientKey
    ? new StackClientApp({
        projectId,
        publishableClientKey,
        tokenStore: "cookie",
      })
    : null;
