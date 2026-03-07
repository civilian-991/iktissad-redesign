import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import type { ApiResponse } from "@/types";

interface AiStatus {
  available: boolean;
  provider: string | null;
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  const hasKey = !!process.env.ANTHROPIC_API_KEY;

  const response: ApiResponse<AiStatus> = {
    data: {
      available: hasKey,
      provider: hasKey ? "anthropic" : null,
    },
  };

  return NextResponse.json(response);
}
