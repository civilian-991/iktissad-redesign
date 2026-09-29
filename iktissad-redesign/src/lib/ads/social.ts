/** Client-safe: social platforms and the post shape used in partner-content reports. */

export const SOCIAL_PLATFORMS = [
  "twitter", "linkedin", "telegram", "facebook", "instagram", "youtube", "whatsapp", "tiktok",
] as const;

export interface SocialPost {
  id: string;
  articleId: string;
  platform: (typeof SOCIAL_PLATFORMS)[number];
  postUrl: string | null;
  status: "pending" | "sent" | "failed";
  postedAt: string | null;
  reach: number | null;
  engagements: number | null;
  metricsUpdatedAt: string | null;
  manual: boolean;
}
