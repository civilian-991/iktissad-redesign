/**
 * Visuals — AI-generated editorial illustration for a GCC article.
 *
 * Generates a GENERIC, conceptual illustration by disclosure category (no text,
 * no real people/faces, no logos/brands) so it never fabricates a depiction of
 * the actual person or company — that would be misinformation for a news outlet.
 * Decodes the image and stores it in Supabase Storage; returns the public URL.
 * Returns null on any failure so the caller can fall back to the branded card.
 */

import { createAdminClient } from '@/lib/supabase/admin';

const GATEWAY_IMAGES =
  process.env.AI_GATEWAY_IMAGES_URL ?? 'https://ai-gateway.vercel.sh/v1/images/generations';

// Category → an English scene prompt (image models prompt better in English).
const SCENE: Record<string, string> = {
  earnings: 'corporate financial growth — rising bar and line charts with upward arrows over a subtle city skyline',
  dividend: 'stacks of coins and flowing money, a cash-payout concept',
  board: 'an empty modern corporate boardroom with a long table and chairs',
  leadership: 'a single empty executive office chair in a modern corporate setting, a leadership-transition concept',
  legal: 'a wooden judge gavel beside brass scales of justice on a desk',
  regulatory: 'official regulatory documents with an official stamp and a gavel',
  ownership: 'two abstract geometric corporate shapes merging together, an acquisition concept',
  deal: 'two abstract puzzle pieces joining, a business-agreement concept',
  capital_change: 'growing stacks of coins beside a corporate tower, a capital-increase concept',
  capital: 'growing stacks of coins beside a corporate tower, a capital-increase concept',
  ipo_listing: 'a stylized stock exchange with a rising graph and an opening-bell concept',
  halt: 'a paused trading screen with a stop symbol, muted red tones',
  debt_fund: 'bond certificates and financing documents with coins',
  market_summary: 'an abstract stock-market dashboard with indices and candlestick charts',
  other: 'an abstract stock-market concept with charts and a city skyline',
};

const STYLE =
  ', flat editorial vector illustration, minimal, professional financial-news style, ' +
  'muted navy / teal / gold palette, clean composition. ' +
  'Absolutely no text, no words, no letters, no numbers, no real people or faces, no logos, no brand names.';

export async function generateAndStoreImage(opts: { category: string; key: string }): Promise<string | null> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) return null;
  const prompt = (SCENE[opts.category] || SCENE.other) + STYLE;

  try {
    const res = await fetch(GATEWAY_IMAGES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.GCC_IMAGE_MODEL ?? 'openai/gpt-image-1',
        prompt,
        size: '1536x1024',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const b64: string | undefined = data?.data?.[0]?.b64_json;
    const remoteUrl: string | undefined = data?.data?.[0]?.url;

    const admin = createAdminClient();
    const path = `gcc-images/${opts.key}.png`;

    let bytes: Buffer | null = null;
    if (b64) bytes = Buffer.from(b64, 'base64');
    else if (remoteUrl) {
      const imgRes = await fetch(remoteUrl);
      if (imgRes.ok) bytes = Buffer.from(await imgRes.arrayBuffer());
    }
    if (!bytes) return null;

    const { error } = await admin.storage
      .from('media')
      .upload(path, bytes, { contentType: 'image/png', upsert: true });
    if (error) {
      console.error('[gcc] image upload failed', error.message);
      return null;
    }
    return admin.storage.from('media').getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error('[gcc] image generation failed', e);
    return null;
  }
}
