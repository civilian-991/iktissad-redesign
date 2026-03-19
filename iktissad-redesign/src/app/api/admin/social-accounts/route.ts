/**
 * Social Accounts OAuth Status
 * GET /api/admin/social-accounts
 *
 * Returns the OAuth connection state for all social platforms.
 * All platforms are disconnected by default — real OAuth is a future milestone.
 */

import { NextResponse } from 'next/server'
import { requireAuth, unauthorizedResponse } from '@/lib/api-auth'

export interface SocialAccountsStatus {
  twitter: {
    connected: boolean
    handle: string | null
  }
  linkedin: {
    connected: boolean
    name: string | null
  }
  telegram: {
    connected: boolean
    channelName: string | null
  }
}

export async function GET() {
  const auth = await requireAuth()
  if (!auth.authenticated) {
    return unauthorizedResponse()
  }

  const status: SocialAccountsStatus = {
    twitter: {
      connected: false,
      handle: null,
    },
    linkedin: {
      connected: false,
      name: null,
    },
    telegram: {
      connected: false,
      channelName: null,
    },
  }

  return NextResponse.json({ data: status })
}
