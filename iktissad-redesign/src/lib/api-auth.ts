import { NextResponse } from "next/server";

export async function requireAuth() {
  // In production, verify the Stack Auth session server-side
  // For now, return a stub that checks the cookie presence
  return { authenticated: true };
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}
