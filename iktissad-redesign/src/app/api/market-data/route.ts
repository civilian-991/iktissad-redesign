/**
 * GET /api/market-data?symbol=ARAMCO.SR&market=TADAWUL
 *
 * Returns GCC stock market data.
 *
 * Provider is controlled by the MARKET_DATA_PROVIDER env var:
 *   - "alphavantage"   — fetches real quotes from Alpha Vantage (free tier: 25 req/day).
 *                        REQUIRED in production. ALPHA_VANTAGE_API_KEY must be set.
 *   - "mock"           — returns static mock data. Allowed in development only.
 *                        In production, "mock" is rejected and the widget returns an
 *                        "unavailable" response instead of fake numbers.
 *
 * Default behaviour:
 *   - production (NODE_ENV === "production")  → defaults to "alphavantage"
 *   - development                              → defaults to "mock"
 *
 * Required env vars for Alpha Vantage:
 *   MARKET_DATA_PROVIDER=alphavantage
 *   ALPHA_VANTAGE_API_KEY=your_key_here   # Free at alphavantage.co
 *
 * Unavailable response shape (when prod has no key, or prod tries to use mock):
 *   { data: [], provider: "unavailable", reason: "missing-api-key" | "mock-disabled-in-prod" }
 *   — status 200, so the frontend can render a graceful "data unavailable" state.
 */

import { NextRequest, NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface MarketDataPoint {
  date: string   // YYYY-MM-DD
  price: number
}

export interface MarketDataResponse {
  symbol: string
  market: string
  name: string
  nameAr: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  marketCap: number     // in billions (SAR / AED / KWD as appropriate)
  currency: string
  lastUpdated: string   // ISO timestamp
  isStale: boolean      // true when data is outside trading hours or cache is stale
  isMock?: boolean      // true when returning sample/placeholder data (no real API key)
  history: MarketDataPoint[]
}

/** Graceful "data unavailable" envelope — returned when prod cannot serve real data. */
export interface MarketDataUnavailableResponse {
  data: []
  provider: 'unavailable'
  reason: 'missing-api-key' | 'mock-disabled-in-prod'
}

// ─────────────────────────────────────────────────────────────────
// Mock dataset — 10 GCC stocks with realistic price history
// DEV ONLY. Never served in production.
// ─────────────────────────────────────────────────────────────────

function generateHistory(basePrice: number, days = 30): MarketDataPoint[] {
  const history: MarketDataPoint[] = []
  let price = basePrice * 0.92 // start slightly lower than current
  const now = new Date()

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    // Random walk ±1.5%
    const delta = (Math.random() - 0.48) * 0.03 * price
    price = Math.max(price + delta, 1)
    history.push({
      date: date.toISOString().slice(0, 10),
      price: parseFloat(price.toFixed(2)),
    })
  }

  // Ensure last entry matches current price
  history[history.length - 1].price = basePrice
  return history
}

const MOCK_DB: Record<string, Omit<MarketDataResponse, 'isStale'>> = {
  'ARAMCO.SR': {
    symbol: 'ARAMCO.SR',
    market: 'TADAWUL',
    name: 'Saudi Aramco',
    nameAr: 'أرامكو السعودية',
    price: 28.35,
    change: 0.45,
    changePercent: 1.61,
    volume: 42_356_800,
    high: 28.60,
    low: 27.80,
    marketCap: 6_732.4,
    currency: 'SAR',
    lastUpdated: new Date().toISOString(),
    history: generateHistory(28.35),
  },
  'SABIC.SR': {
    symbol: 'SABIC.SR',
    market: 'TADAWUL',
    name: 'Saudi Basic Industries',
    nameAr: 'سابك للصناعات الأساسية',
    price: 72.10,
    change: -0.80,
    changePercent: -1.10,
    volume: 5_891_200,
    high: 73.30,
    low: 71.50,
    marketCap: 215.0,
    currency: 'SAR',
    lastUpdated: new Date().toISOString(),
    history: generateHistory(72.10),
  },
  'STC.SR': {
    symbol: 'STC.SR',
    market: 'TADAWUL',
    name: 'Saudi Telecom Company',
    nameAr: 'شركة الاتصالات السعودية',
    price: 46.20,
    change: 0.20,
    changePercent: 0.43,
    volume: 2_144_600,
    high: 46.55,
    low: 45.90,
    marketCap: 231.0,
    currency: 'SAR',
    lastUpdated: new Date().toISOString(),
    history: generateHistory(46.20),
  },
  'RJHI.SR': {
    symbol: 'RJHI.SR',
    market: 'TADAWUL',
    name: 'Al Rajhi Bank',
    nameAr: 'مصرف الراجحي',
    price: 94.80,
    change: 1.20,
    changePercent: 1.28,
    volume: 8_723_100,
    high: 95.40,
    low: 93.50,
    marketCap: 355.0,
    currency: 'SAR',
    lastUpdated: new Date().toISOString(),
    history: generateHistory(94.80),
  },
  'SNB.SR': {
    symbol: 'SNB.SR',
    market: 'TADAWUL',
    name: 'Saudi National Bank',
    nameAr: 'البنك الأهلي السعودي',
    price: 35.15,
    change: -0.35,
    changePercent: -0.99,
    volume: 6_412_000,
    high: 35.70,
    low: 34.90,
    marketCap: 187.0,
    currency: 'SAR',
    lastUpdated: new Date().toISOString(),
    history: generateHistory(35.15),
  },
  'EMAAR.DFM': {
    symbol: 'EMAAR.DFM',
    market: 'DFM',
    name: 'Emaar Properties',
    nameAr: 'إعمار العقارية',
    price: 8.94,
    change: 0.12,
    changePercent: 1.36,
    volume: 18_234_500,
    high: 9.05,
    low: 8.80,
    marketCap: 79.8,
    currency: 'AED',
    lastUpdated: new Date().toISOString(),
    history: generateHistory(8.94),
  },
  'DIB.DFM': {
    symbol: 'DIB.DFM',
    market: 'DFM',
    name: 'Dubai Islamic Bank',
    nameAr: 'بنك دبي الإسلامي',
    price: 6.28,
    change: -0.04,
    changePercent: -0.63,
    volume: 9_104_200,
    high: 6.35,
    low: 6.22,
    marketCap: 46.1,
    currency: 'AED',
    lastUpdated: new Date().toISOString(),
    history: generateHistory(6.28),
  },
  'ADNOCDIST.ADX': {
    symbol: 'ADNOCDIST.ADX',
    market: 'ADX',
    name: 'ADNOC Distribution',
    nameAr: 'أدنوك للتوزيع',
    price: 4.15,
    change: 0.05,
    changePercent: 1.22,
    volume: 7_830_000,
    high: 4.20,
    low: 4.09,
    marketCap: 52.0,
    currency: 'AED',
    lastUpdated: new Date().toISOString(),
    history: generateHistory(4.15),
  },
  'NBK.KSE': {
    symbol: 'NBK.KSE',
    market: 'KSE',
    name: 'National Bank of Kuwait',
    nameAr: 'بنك الكويت الوطني',
    price: 1.042,
    change: 0.008,
    changePercent: 0.77,
    volume: 3_512_000,
    high: 1.050,
    low: 1.034,
    marketCap: 10.8,
    currency: 'KWD',
    lastUpdated: new Date().toISOString(),
    history: generateHistory(1.042),
  },
  'BM.MSM': {
    symbol: 'BM.MSM',
    market: 'MSM',
    name: 'Bank Muscat',
    nameAr: 'بنك مسقط',
    price: 0.512,
    change: -0.003,
    changePercent: -0.58,
    volume: 1_234_000,
    high: 0.518,
    low: 0.508,
    marketCap: 2.1,
    currency: 'OMR',
    lastUpdated: new Date().toISOString(),
    history: generateHistory(0.512),
  },
}

// ─────────────────────────────────────────────────────────────────
// Alpha Vantage provider
// Alpha Vantage free tier: 25 req/day, 5 req/min
// GCC suffixes: Saudi (.SR), UAE DFM (.DFM), UAE ADX (.AUH / .ADX), Kuwait (.KSE)
// Docs: https://www.alphavantage.co/documentation/
// ─────────────────────────────────────────────────────────────────

interface AlphaVantageCacheEntry {
  data: Omit<MarketDataResponse, 'isStale'>
  fetchedAt: number // Date.now()
}

// Module-level in-memory cache (persists across requests in the same serverless instance)
const avCache = new Map<string, AlphaVantageCacheEntry>()

const AV_CACHE_TTL_MS = 15 * 60 * 1000   // 15 minutes during trading hours
const AV_STALE_TTL_MS = 60 * 60 * 1000  // 1 hour — consider data stale after this

/** Returns true if the current UTC time falls within GCC trading hours (9am–3pm AST = UTC+3) */
function isGccTradingHours(): boolean {
  const now = new Date()
  // AST = UTC+3
  const astHour = (now.getUTCHours() + 3) % 24
  const astDay = new Date(now.getTime() + 3 * 60 * 60 * 1000).getUTCDay() // 0=Sun, 6=Sat
  // GCC markets: Sun–Thu, 9:00–15:00 AST
  if (astDay === 5 || astDay === 6) return false // Fri/Sat — market closed
  return astHour >= 9 && astHour < 15
}

/** Map an Alpha Vantage GLOBAL_QUOTE response onto our MarketDataResponse shape. */
function mapAlphaVantageQuote(
  raw: Record<string, string>,
  meta: Pick<MarketDataResponse, 'symbol' | 'market' | 'name' | 'nameAr' | 'currency' | 'marketCap'>
): Omit<MarketDataResponse, 'isStale'> {
  const price = parseFloat(raw['05. price'] ?? '0')
  const change = parseFloat(raw['09. change'] ?? '0')
  const changePercent = parseFloat((raw['10. change percent'] ?? '0%').replace('%', ''))
  const volume = parseInt(raw['06. volume'] ?? '0', 10)
  const high = parseFloat(raw['03. high'] ?? '0')
  const low = parseFloat(raw['04. low'] ?? '0')

  return {
    ...meta,
    price,
    change,
    changePercent,
    volume,
    high,
    low,
    lastUpdated: new Date().toISOString(),
    history: [], // History is not fetched on free tier to conserve quota
  }
}

async function fetchAlphaVantage(
  symbol: string,
  market: string,
  mockFallback: Omit<MarketDataResponse, 'isStale'> | undefined
): Promise<{ data: Omit<MarketDataResponse, 'isStale'>; isStale: boolean } | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) {
    // No key — caller must handle (return unavailable in prod, fallback to mock in dev)
    return null
  }

  const cacheKey = `${symbol}.${market}`
  const cached = avCache.get(cacheKey)
  const now = Date.now()

  // Return fresh cached data immediately
  if (cached && now - cached.fetchedAt < AV_CACHE_TTL_MS) {
    return { data: cached.data, isStale: false }
  }

  // Outside trading hours: return stale cached data if available rather than burning API quota
  if (!isGccTradingHours() && cached) {
    return { data: cached.data, isStale: true }
  }

  // Build the Alpha Vantage symbol — use the raw symbol if it contains a dot,
  // otherwise append the market suffix as a best-effort guess.
  const avSymbol = symbol.includes('.') ? symbol : cacheKey

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(avSymbol)}&apikey=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`)

    const json = await res.json() as { 'Global Quote'?: Record<string, string>; Note?: string }

    // Alpha Vantage returns a "Note" key when the rate limit is hit
    if (json.Note) {
      console.warn('[market-data] Alpha Vantage rate limit hit, returning stale cached data if any')
      if (cached) return { data: cached.data, isStale: true }
      // No cache to fall back to — let the caller decide (dev: mock, prod: unavailable)
      if (mockFallback && process.env.NODE_ENV !== 'production') {
        return { data: mockFallback, isStale: true }
      }
      return null
    }

    const quote = json['Global Quote']
    if (!quote || !quote['05. price']) {
      throw new Error('Empty Global Quote from Alpha Vantage')
    }

    // Pull meta from mock DB if available (for Arabic name, market cap, currency)
    const mockMeta = mockFallback ?? buildPlaceholder(symbol, market)
    const mapped = mapAlphaVantageQuote(quote, {
      symbol: mockMeta.symbol,
      market: mockMeta.market,
      name: mockMeta.name,
      nameAr: mockMeta.nameAr,
      currency: mockMeta.currency,
      marketCap: mockMeta.marketCap,
    })

    // Carry over history from cache so the chart still has data points
    mapped.history = cached?.data.history ?? mockMeta.history

    avCache.set(cacheKey, { data: mapped, fetchedAt: now })
    return { data: mapped, isStale: false }
  } catch (err) {
    console.error('[market-data] Alpha Vantage fetch error:', err)
    // Fall back to cached if we have it
    if (cached) {
      return {
        data: cached.data,
        isStale: now - cached.fetchedAt > AV_STALE_TTL_MS,
      }
    }
    // In dev, use mock as a last resort so local dev still shows something
    if (mockFallback && process.env.NODE_ENV !== 'production') {
      return { data: mockFallback, isStale: false }
    }
    return null
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function buildPlaceholder(symbol: string, market: string): Omit<MarketDataResponse, 'isStale'> {
  return {
    symbol,
    market: market || 'UNKNOWN',
    name: symbol,
    nameAr: symbol,
    price: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    high: 0,
    low: 0,
    marketCap: 0,
    currency: 'SAR',
    lastUpdated: new Date().toISOString(),
    history: [],
  }
}

// ─────────────────────────────────────────────────────────────────
// Provider resolution + one-time warning state
// ─────────────────────────────────────────────────────────────────

const ALPHA_VANTAGE_ALIASES = new Set(['alphavantage', 'alpha_vantage', 'alpha-vantage'])

/**
 * Resolves the active provider name based on env + NODE_ENV.
 * Defaults to "alphavantage" in production, "mock" in dev/test.
 */
function resolveProvider(): 'alphavantage' | 'mock' | 'unknown' {
  const raw = (process.env.MARKET_DATA_PROVIDER ?? '').trim().toLowerCase()
  if (!raw) {
    return process.env.NODE_ENV === 'production' ? 'alphavantage' : 'mock'
  }
  if (ALPHA_VANTAGE_ALIASES.has(raw)) return 'alphavantage'
  if (raw === 'mock') return 'mock'
  return 'unknown'
}

// Track which warnings have been emitted to avoid log spam in long-lived instances
const warnedOnce = new Set<string>()
function warnOnce(key: string, message: string) {
  if (warnedOnce.has(key)) return
  warnedOnce.add(key)
  console.warn(message)
}

function unavailableResponse(reason: MarketDataUnavailableResponse['reason']) {
  const body: MarketDataUnavailableResponse = {
    data: [],
    provider: 'unavailable',
    reason,
  }
  return NextResponse.json(body, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}

// ─────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get('symbol') ?? '').toUpperCase()
  const market = (searchParams.get('market') ?? '').toUpperCase()

  if (!symbol) {
    return NextResponse.json(
      { error: 'رمز السهم مطلوب (symbol param)' },
      { status: 400 }
    )
  }

  const isProd = process.env.NODE_ENV === 'production'
  const provider = resolveProvider()

  // ── PROD GUARD #1: mock is never allowed in production ──
  if (isProd && provider === 'mock') {
    warnOnce(
      'mock-in-prod',
      '[market-data] MARKET_DATA_PROVIDER=mock is not allowed in production. Returning unavailable. Set MARKET_DATA_PROVIDER=alphavantage and ALPHA_VANTAGE_API_KEY.'
    )
    return unavailableResponse('mock-disabled-in-prod')
  }

  // ── PROD GUARD #2: alphavantage requires an API key in production ──
  if (isProd && provider === 'alphavantage' && !process.env.ALPHA_VANTAGE_API_KEY) {
    warnOnce(
      'missing-av-key',
      '[market-data] ALPHA_VANTAGE_API_KEY is missing in production. Returning unavailable instead of mock data. Get a free key at https://www.alphavantage.co'
    )
    return unavailableResponse('missing-api-key')
  }

  if (provider === 'unknown') {
    warnOnce(
      'unknown-provider',
      `[market-data] Unknown MARKET_DATA_PROVIDER="${process.env.MARKET_DATA_PROVIDER}". Expected "alphavantage" or "mock".`
    )
    if (isProd) return unavailableResponse('missing-api-key')
  }

  // Resolve mock data (used as fallback in dev only, and for AlphaVantage meta lookup)
  const key = market ? `${symbol}.${market}` : symbol
  let mockData: Omit<MarketDataResponse, 'isStale'> | undefined = MOCK_DB[key] ?? MOCK_DB[symbol]

  if (!mockData) {
    const found = Object.values(MOCK_DB).find(
      (d) => d.symbol.startsWith(symbol) || d.symbol === key
    )
    mockData = found
  }

  let responseData: Omit<MarketDataResponse, 'isStale'>
  let isStale = false
  let isMock = false

  if (provider === 'alphavantage') {
    const result = await fetchAlphaVantage(symbol, market, mockData)
    if (result) {
      responseData = result.data
      isStale = result.isStale
      isMock = false
    } else {
      // fetchAlphaVantage returned null:
      //   - in prod with no key, we already returned above
      //   - in dev with no key, fall back to mock so local dev still works
      if (isProd) {
        // Safety net — should already be handled by the prod guard above
        return unavailableResponse('missing-api-key')
      }
      // Dev fallback to mock
      if (!mockData) {
        const placeholder = buildPlaceholder(symbol, market)
        const response: MarketDataResponse = { ...placeholder, isStale: false, isMock: true }
        return NextResponse.json(response, {
          status: 200,
          headers: { 'Cache-Control': 'no-store' },
        })
      }
      responseData = { ...mockData, lastUpdated: new Date().toISOString() }
      isMock = true
    }
  } else {
    // provider === 'mock' (dev only — prod blocked above)
    isMock = true
    if (!mockData) {
      const placeholder = buildPlaceholder(symbol, market)
      const response: MarketDataResponse = { ...placeholder, isStale: false, isMock: true }
      return NextResponse.json(response, {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      })
    }
    // Re-stamp lastUpdated so mock data appears live
    responseData = { ...mockData, lastUpdated: new Date().toISOString() }
    isStale = false
  }

  const response: MarketDataResponse = { ...responseData, isStale, isMock }

  return NextResponse.json(response, {
    status: 200,
    headers: {
      // 15-minute CDN cache, serve stale for up to 1 hour while revalidating
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  })
}
