/**
 * GET /api/promo-codes/validate?code=XXXX&planId=yyy&billingCycle=monthly
 *
 * Public endpoint — no auth required.
 * Validates a promo code and returns the discount details if valid.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResponse } from '@/types';

export interface PromoValidateResult {
  valid: boolean;
  message: string;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  discountLabel?: string; // e.g. "20% خصم" or "10 ر.س خصم"
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PromoValidateResult>>> {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get('code') ?? '').trim().toUpperCase();

  if (!code) {
    return NextResponse.json({
      data: { valid: false, message: 'الرمز غير صالح' },
    });
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: promo, error } = await (admin as any)
    .from('promo_codes')
    .select(
      'id, code, discount_type, discount_value, max_uses, uses_count, valid_until, is_active'
    )
    .eq('code', code)
    .maybeSingle();

  if (error) {
    console.error('[promo-codes/validate] DB error:', error.message);
    return NextResponse.json({
      data: { valid: false, message: 'حدث خطأ. يرجى المحاولة مرة أخرى.' },
    });
  }

  if (!promo || !promo.is_active) {
    return NextResponse.json({
      data: { valid: false, message: 'الرمز غير صالح أو منتهي الصلاحية' },
    });
  }

  // Check expiry
  if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
    return NextResponse.json({
      data: { valid: false, message: 'رمز الخصم منتهي الصلاحية' },
    });
  }

  // Check usage limit
  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return NextResponse.json({
      data: { valid: false, message: 'رمز الخصم استُنفد' },
    });
  }

  const discountType: 'percent' | 'fixed' = promo.discount_type;
  const discountValue: number = Number(promo.discount_value);
  const discountLabel =
    discountType === 'percent'
      ? `${discountValue}% خصم`
      : `${discountValue} ر.س خصم`;

  return NextResponse.json({
    data: {
      valid: true,
      message: discountLabel,
      discountType,
      discountValue,
      discountLabel,
    },
  });
}
