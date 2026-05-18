/**
 * A/B Test Management API Route
 * /api/admin/ab-tests
 *
 * GET   — returns all A/B tests (optionally filtered by ?articleId=…)
 * POST  — creates a new A/B test
 * PATCH — updates a test's status (start / stop / complete)
 *
 * Storage: Supabase tables `ab_tests` / `ab_test_assignments` / `ab_test_events`
 * (see migration 20260518_038_abtests_table.sql).
 *
 * NOTE: keep the request/response shape stable — `HeadlineABLab.tsx` imports
 * the `ABTest` type from this file and calls these endpoints with the schema
 * defined below.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { mapABTestRow, publicStatusToDb } from '@/lib/supabase/mappers'

// ─────────────────────────────────────────────────────────────────────────────
// Public types — consumed by HeadlineABLab via `import type { ABTest } from ...`
// ─────────────────────────────────────────────────────────────────────────────

export interface ABTest {
  id: string
  articleId: string
  variantA: string
  variantB: string
  durationHours: number
  trafficSplit: number       // Variant A percentage (50 = 50/50)
  status: 'active' | 'stopped' | 'completed'
  startedAt: string          // ISO 8601
  endsAt: string             // ISO 8601
  createdBy?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const createTestSchema = z.object({
  articleId: z.string().min(1, 'articleId مطلوب'),
  variantA: z.string().min(1, 'variantA (العنوان الأصلي) مطلوب'),
  variantB: z.string().min(1, 'variantB (العنوان المنافس) مطلوب'),
  durationHours: z.number().int().min(1).max(168).default(24),
  trafficSplit: z.number().min(10).max(90).default(50),
})

const updateTestSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['active', 'stopped', 'completed']),
})

// ─────────────────────────────────────────────────────────────────────────────
// GET — List all tests (optionally filter by articleId)
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return unauthorizedResponse()

  const searchParams = request.nextUrl.searchParams
  const articleId = searchParams.get('articleId')

  const admin = createAdminClient()
  let query = (admin.from('ab_tests') as any)
    .select('*')
    .order('created_at', { ascending: false })

  if (articleId) {
    // articleId is stored in the `name` column (matches POST below).
    query = query.eq('name', articleId)
  }

  const { data, error } = (await query) as { data: any[] | null; error: any }
  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'فشل في جلب الاختبارات' },
      { status: 500 },
    )
  }

  const now = Date.now()
  const rows = data ?? []

  // Auto-complete any running test whose end time has passed.
  const tests: ABTest[] = []
  for (const row of rows) {
    let mapped = mapABTestRow(row)
    if (mapped.status === 'active' && new Date(mapped.endsAt).getTime() < now) {
      const { data: updated, error: updErr } = (await (admin.from('ab_tests') as any)
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', row.id)
        .select()
        .single()) as { data: any; error: any }
      if (!updErr && updated) {
        mapped = mapABTestRow(updated)
      } else {
        mapped = { ...mapped, status: 'completed' }
      }
    }
    tests.push(mapped)
  }

  return NextResponse.json({ tests })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Create a new A/B test
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return unauthorizedResponse()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createTestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 },
    )
  }

  const { articleId, variantA, variantB, durationHours, trafficSplit } = parsed.data

  const admin = createAdminClient()

  // Stop any currently running test for this article (one active test per article).
  await (admin.from('ab_tests') as any)
    .update({ status: 'paused' })
    .eq('name', articleId)
    .eq('status', 'running')

  const now = new Date()
  const endsAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000)

  const insertData = {
    name: articleId,
    description: `Headline A/B test for article ${articleId}`,
    variants: [
      { key: 'A', weight: trafficSplit, payload: { text: variantA } },
      { key: 'B', weight: 100 - trafficSplit, payload: { text: variantB } },
      // Stash UI metadata so we can round-trip without re-parsing weights.
      {
        key: '_meta',
        weight: 0,
        payload: { articleId, variantA, variantB, trafficSplit, durationHours },
      },
    ],
    status: 'running' as const,
    target_metric: 'ctr',
    started_at: now.toISOString(),
    ended_at: endsAt.toISOString(),
    created_by: auth.userId ?? null,
  }
  // The mapper reads articleId/variantA/etc out of `variants` jsonb via the
  // last item — but we also accept the cleaner shape used by the public payload
  // (object instead of array). For simplicity persist as an object too:
  ;(insertData as any).variants = {
    articleId,
    variantA,
    variantB,
    trafficSplit,
    durationHours,
    items: insertData.variants,
  }

  const { data, error } = (await (admin.from('ab_tests') as any)
    .insert(insertData)
    .select()
    .single()) as { data: any; error: any }

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'فشل في إنشاء الاختبار' },
      { status: 500 },
    )
  }

  return NextResponse.json({ test: mapABTestRow(data) }, { status: 201 })
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — Update test status (start / stop / complete)
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.authenticated) return unauthorizedResponse()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateTestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const dbStatus = publicStatusToDb(parsed.data.status)

  const updateData: Record<string, unknown> = { status: dbStatus }
  if (dbStatus === 'completed' || dbStatus === 'paused') {
    updateData.ended_at = new Date().toISOString()
  }

  const { data, error } = (await (admin.from('ab_tests') as any)
    .update(updateData)
    .eq('id', parsed.data.id)
    .select()
    .single()) as { data: any; error: any }

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'الاختبار غير موجود' },
      { status: error ? 500 : 404 },
    )
  }

  return NextResponse.json({ test: mapABTestRow(data) })
}
