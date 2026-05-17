import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const BASE = 'https://mt-client-api-v1.london.agiliumtrade.ai'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: mtAccount } = await supabase
      .from('mt_accounts')
      .select('*')
      .eq('master_id', user.id)
      .single()

    if (!mtAccount) return NextResponse.json({ error: 'No account connected' }, { status: 404 })

    const id = mtAccount.metaapi_account_id
    const headers = { 'auth-token': process.env.METAAPI_TOKEN! }

    const end = new Date().toISOString()
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [infoRes, positionsRes, dealsRes] = await Promise.all([
      fetch(`${BASE}/users/current/accounts/${id}/account-information`, { headers }),
      fetch(`${BASE}/users/current/accounts/${id}/positions`, { headers }),
      fetch(`${BASE}/users/current/accounts/${id}/history-deals/time/${start}/${end}`, { headers }),
    ])

    const [info, positions, deals] = await Promise.all([
      infoRes.json(),
      positionsRes.json(),
      dealsRes.json(),
    ])

    return NextResponse.json({
      info: infoRes.ok ? info : null,
      positions: Array.isArray(positions) ? positions : [],
      deals: Array.isArray(deals) ? deals : [],
      account: {
        platform: mtAccount.platform,
        server: mtAccount.server,
        login: mtAccount.login,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
