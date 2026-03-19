/**
 * GET /api/market-data?symbol=ARAMCO.SR&market=TADAWUL
 *
 * Returns mock market data for GCC stocks.
 * Real Alpha Vantage / financial-data integration is a future milestone.
 * Structure is stable so the frontend MarketWidget can be built against it now.
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
  history: MarketDataPoint[]
}

// ─────────────────────────────────────────────────────────────────
// Mock dataset — 10 GCC stocks with realistic price history
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

const MOCK_DB: Record<string, MarketDataResponse> = {
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

  // Try exact key first, then symbol-only fallback
  const key = market ? `${symbol}.${market}` : symbol
  let data: MarketDataResponse | undefined = MOCK_DB[key] ?? MOCK_DB[symbol]

  // Try matching by just the symbol portion (e.g. "ARAMCO" → ARAMCO.SR)
  if (!data) {
    const found = Object.values(MOCK_DB).find(
      (d) => d.symbol.startsWith(symbol) || d.symbol === key
    )
    data = found
  }

  if (!data) {
    // Return a generic placeholder so the widget never hard-crashes
    const placeholderData: MarketDataResponse = {
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
    return NextResponse.json(placeholderData, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  // Re-stamp lastUpdated so it appears live
  const response: MarketDataResponse = {
    ...data,
    lastUpdated: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
