/**
 * PDF Export API Route — GET /api/pdf/magazine/[issueId]
 *
 * Admin-only. Launches Puppeteer to render the print-mode spread page
 * and returns an A3-landscape PDF stream.
 *
 * Architecture:
 * 1. Generate a time-limited security token for the /print/[issueId] route.
 * 2. Launch Puppeteer with @sparticuz/chromium-min (or local Chrome fallback).
 * 3. Navigate to the print route, wait for content.
 * 4. Generate PDF, stream it back.
 *
 * NOTE: Puppeteer + chromium-min may not work on Vercel serverless functions.
 * TODO: For production, deploy PDF export as a separate worker/service
 *       (EC2 container, Fly.io, or a managed PDF API like Browserless.io / Gotenberg).
 *       The /print/[issueId] route can be used by any headless browser service.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

// ── In-memory token store (5-minute TTL) ──────────────────────
// For production with multiple instances, use Redis instead.

interface TokenEntry {
  issueId: string
  expiresAt: number
}

const tokenStore = new Map<string, TokenEntry>()

function generatePrintToken(issueId: string): string {
  // Purge expired tokens
  const now = Date.now()
  for (const [k, v] of tokenStore) {
    if (v.expiresAt < now) tokenStore.delete(k)
  }

  const secret = process.env.PRINT_SECRET
  if (!secret) throw new Error('PRINT_SECRET env var not set')

  // Generate the same deterministic token the print page expects
  const token = Buffer.from(`${secret}:${issueId}`).toString('base64url')

  tokenStore.set(token, {
    issueId,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
  })

  return token
}

// ── Route handler ──────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  // Auth: admin only
  const auth = await requireAuth()
  if (!auth.authenticated) {
    return unauthorizedResponse()
  }

  const { issueId } = await params

  if (!issueId || !/^[0-9a-f-]{36}$/i.test(issueId)) {
    return NextResponse.json({ error: 'Invalid issueId' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // Generate print token
  let token: string
  try {
    token = generatePrintToken(issueId)
  } catch (err) {
    return NextResponse.json(
      { error: 'PRINT_SECRET not configured. Set it in .env.local.' },
      { status: 503 }
    )
  }

  const printUrl = `${siteUrl}/print/${issueId}?token=${token}`

  // ── Launch Puppeteer ─────────────────────────────────────────
  let browser: import('puppeteer-core').Browser | null = null

  try {
    // Try @sparticuz/chromium-min first (works in Lambda/containerised envs)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    let executablePath: string | undefined
    let launchArgs: string[] = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const chromium = require('@sparticuz/chromium-min')
      // Use a public chromium build URL or local pack
      executablePath = await chromium.executablePath(
        process.env.CHROMIUM_PACK_URL ?? undefined
      )
      launchArgs = chromium.args ?? launchArgs
    } catch {
      // @sparticuz/chromium-min unavailable or no pack URL — fall back to local Chrome
      // Common paths for macOS / Linux
      const possiblePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        process.env.CHROME_EXECUTABLE_PATH ?? '',
      ]
      executablePath = possiblePaths.find((p) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require('fs').accessSync(p)
          return true
        } catch {
          return false
        }
      })
    }

    if (!executablePath) {
      return NextResponse.json(
        {
          error:
            'PDF generation unavailable in this environment. ' +
            'Set CHROME_EXECUTABLE_PATH or CHROMIUM_PACK_URL, or deploy to a container with Chrome installed. ' +
            'Alternative: use the /print/[issueId] route with Browserless.io or Gotenberg.',
        },
        { status: 503 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const puppeteer = require('puppeteer-core')

    browser = await puppeteer.launch({
      args: launchArgs,
      defaultViewport: {
        width: 1587,  // A3 landscape at 96dpi ≈ 420mm × 3.78
        height: 1123, // 297mm × 3.78
      },
      executablePath,
      headless: true,
    })

    const page = await (browser as any).newPage()

    // Set Arabic locale and timezone
    await page.emulateMediaType('print')
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ar,ar-SA;q=0.9,en;q=0.8' })

    // Navigate to print route — Puppeteer loads external resources (Google Fonts)
    await page.goto(printUrl, {
      waitUntil: 'networkidle0',
      timeout: 60_000,
    })

    // Wait for spread content to be rendered
    await page.waitForSelector('.spread-container', { timeout: 30_000 }).catch(() => {
      // If no spreads, still proceed — page renders empty state
    })

    // Short delay to ensure fonts are fully rendered
    await new Promise((r) => setTimeout(r, 1500))

    // Generate PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer: Uint8Array = await (page as any).pdf({
      format: 'A3',
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })

    await (browser as NonNullable<typeof browser>).close()
    browser = null

    // Return PDF as stream (convert Uint8Array to ArrayBuffer for NextResponse)
    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="magazine-${issueId}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    if (browser) {
      await browser.close().catch(() => {})
    }

    console.error('[pdf-export] Puppeteer error:', err)

    return NextResponse.json(
      {
        error:
          'PDF generation failed. ' +
          'This feature requires a Chrome/Chromium binary. ' +
          'For production: deploy this route as a separate service (EC2, Fly.io, Render) ' +
          'or use a managed PDF API (Browserless.io, Gotenberg, Playwright Cloud).',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    )
  }
}
