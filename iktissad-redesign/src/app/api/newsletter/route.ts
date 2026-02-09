import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

interface NewsletterSubscription {
  email: string;
  subscribedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        {
          error: "A valid email address is required",
        } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: "Invalid email format",
        } satisfies ApiResponse<never>,
        { status: 400 }
      );
    }

    // In production, this would save to a database or email service
    // For now, return a success response with mock data
    const subscription: NewsletterSubscription = {
      email,
      subscribedAt: new Date().toISOString(),
    };

    const response: ApiResponse<NewsletterSubscription> = {
      data: subscription,
    };

    return NextResponse.json(response, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body",
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }
}
