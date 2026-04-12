/**
 * POST /api/ai/social-card
 *
 * Generates branded social media card images for an article.
 * Uses next/og (ImageResponse) to render PNG images and uploads them
 * to Supabase Storage. Returns public URLs for Twitter, LinkedIn, WhatsApp.
 *
 * Request body: { articleId: string; title: string; featuredImage?: string; accentColor?: string }
 * Response:     { data: { twitter: string; linkedin: string; whatsapp: string } }
 *
 * Requires admin auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ImageResponse } from "next/og";
import React from "react";
import type { ApiResponse } from "@/types";

const bodySchema = z.object({
  articleId: z.string().uuid(),
  title: z.string().min(1).max(200),
  featuredImage: z.string().url().optional().or(z.literal("")),
  accentColor: z.string().optional().default("#c9a84c"),
});

interface SocialCardResult {
  twitter: string;
  linkedin: string;
  whatsapp: string;
}

/** Sizes for each platform */
const CARD_SIZES = {
  twitter: { width: 1200, height: 628 },
  linkedin: { width: 1200, height: 627 },
  whatsapp: { width: 1200, height: 630 },
} as const;

type Platform = keyof typeof CARD_SIZES;

/**
 * Build the JSX element for the social card.
 * Uses inline styles (Satori/next/og requirement — no Tailwind classes).
 */
function buildCardElement(
  title: string,
  platform: Platform,
  accentColor: string,
  featuredImageUrl?: string
): React.ReactElement {
  const { width, height } = CARD_SIZES[platform];

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: "#0d0d0d",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      },
    },
    // Background image with overlay
    featuredImageUrl &&
      React.createElement("img", {
        src: featuredImageUrl,
        style: {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.25,
        },
      }),
    // Gradient overlay
    React.createElement("div", {
      style: {
        position: "absolute",
        inset: 0,
        background: `linear-gradient(135deg, #0d0d0d 40%, ${accentColor}22 100%)`,
      },
    }),
    // Gold accent bar (top)
    React.createElement("div", {
      style: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        backgroundColor: accentColor,
      },
    }),
    // Content container
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
        },
      },
      // Top: brand name
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 12,
          },
        },
        React.createElement("div", {
          style: {
            width: 8,
            height: 40,
            backgroundColor: accentColor,
            borderRadius: 4,
          },
        }),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 28,
              fontWeight: 700,
              color: accentColor,
              letterSpacing: "0.08em",
            },
          },
          "IKTISSAD"
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 14,
              color: "rgba(255,255,255,0.4)",
              marginRight: "auto",
            },
          },
          "الاقتصاد والأعمال"
        )
      ),
      // Middle: article title
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 16,
          },
        },
        React.createElement(
          "p",
          {
            style: {
              fontSize: Math.min(52, Math.max(32, Math.round(2200 / title.length))),
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.35,
              direction: "rtl",
              textAlign: "right",
              margin: 0,
              maxWidth: "90%",
              alignSelf: "flex-end",
            },
          },
          title.length > 120 ? title.slice(0, 120) + "…" : title
        )
      ),
      // Bottom: URL
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        React.createElement(
          "span",
          {
            style: {
              fontSize: 16,
              color: "rgba(255,255,255,0.35)",
              direction: "ltr",
            },
          },
          "iktissadonline.com"
        ),
        React.createElement("div", {
          style: {
            width: 48,
            height: 3,
            backgroundColor: accentColor,
            borderRadius: 2,
          },
        })
      )
    )
  );
}

/**
 * Generate a PNG buffer for a given platform using next/og ImageResponse.
 */
async function generateCardBuffer(
  title: string,
  platform: Platform,
  accentColor: string,
  featuredImageUrl?: string
): Promise<Buffer> {
  const { width, height } = CARD_SIZES[platform];

  const element = buildCardElement(title, platform, accentColor, featuredImageUrl);
  const imageResponse = new ImageResponse(element, { width, height });
  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { articleId, title, featuredImage, accentColor } = parsed.data;

  try {
    // Generate all 3 card sizes in parallel
    const [twitterBuffer, linkedinBuffer, whatsappBuffer] = await Promise.all([
      generateCardBuffer(title, "twitter", accentColor, featuredImage || undefined),
      generateCardBuffer(title, "linkedin", accentColor, featuredImage || undefined),
      generateCardBuffer(title, "whatsapp", accentColor, featuredImage || undefined),
    ]);

    // Upload to Supabase Storage
    const admin = createAdminClient();
    const timestamp = Date.now();
    const basePath = `social-cards/${articleId}`;

    const uploads = await Promise.all([
      admin.storage
        .from("media")
        .upload(`${basePath}/twitter-${timestamp}.png`, twitterBuffer, {
          contentType: "image/png",
          upsert: true,
        }),
      admin.storage
        .from("media")
        .upload(`${basePath}/linkedin-${timestamp}.png`, linkedinBuffer, {
          contentType: "image/png",
          upsert: true,
        }),
      admin.storage
        .from("media")
        .upload(`${basePath}/whatsapp-${timestamp}.png`, whatsappBuffer, {
          contentType: "image/png",
          upsert: true,
        }),
    ]);

    const errors = uploads.filter((u) => u.error);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: `Storage upload failed: ${errors[0].error?.message}` } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }

    // Get public URLs
    const [twitterUrl, linkedinUrl, whatsappUrl] = uploads.map((u) => {
      const { data } = admin.storage
        .from("media")
        .getPublicUrl(u.data!.path);
      return data.publicUrl;
    });

    const response: ApiResponse<SocialCardResult> = {
      data: {
        twitter: twitterUrl,
        linkedin: linkedinUrl,
        whatsapp: whatsappUrl,
      },
    };
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to generate social cards",
      } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}
