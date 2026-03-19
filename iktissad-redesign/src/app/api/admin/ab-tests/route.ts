/**
 * A/B Test Management API Route
 * /api/admin/ab-tests
 *
 * GET  — returns all active A/B tests
 * POST — creates a new A/B test
 *
 * Storage: in-memory module-level Map (session-persistent, no DB migration needed).
 * The Map is keyed by articleId so each article can have at most one active test.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

// ─────────────────────────────────────────────────────────────────────────────
// Types
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
// In-memory store (module-level — persists for the lifetime of the server process)
// ─────────────────────────────────────────────────────────────────────────────

// Key: test id, Value: ABTest
const store = new Map<string, ABTest>()

function generateId(): string {
  return `abtest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
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

  const tests = Array.from(store.values())

  const filtered = articleId
    ? tests.filter((t) => t.articleId === articleId)
    : tests

  // Mark completed tests whose endAt has passed
  const now = new Date()
  const updated = filtered.map((t) => {
    if (t.status === 'active' && new Date(t.endsAt) < now) {
      const completed = { ...t, status: 'completed' as const }
      store.set(t.id, completed)
      return completed
    }
    return t
  })

  return NextResponse.json({ tests: updated })
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
      { status: 400 }
    )
  }

  const { articleId, variantA, variantB, durationHours, trafficSplit } = parsed.data

  // Stop any existing active test for this article
  for (const [key, test] of store.entries()) {
    if (test.articleId === articleId && test.status === 'active') {
      store.set(key, { ...test, status: 'stopped' })
    }
  }

  const now = new Date()
  const endsAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000)

  const test: ABTest = {
    id: generateId(),
    articleId,
    variantA,
    variantB,
    durationHours,
    trafficSplit,
    status: 'active',
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    createdBy: auth.userId,
  }

  store.set(test.id, test)

  return NextResponse.json({ test }, { status: 201 })
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — Update test status (start / stop)
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
      { status: 400 }
    )
  }

  const existing = store.get(parsed.data.id)
  if (!existing) {
    return NextResponse.json({ error: 'الاختبار غير موجود' }, { status: 404 })
  }

  const updated = { ...existing, status: parsed.data.status }
  store.set(parsed.data.id, updated)

  return NextResponse.json({ test: updated })
}
