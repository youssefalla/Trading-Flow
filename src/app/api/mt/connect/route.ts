import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PROVISIONING = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai'

export async function POST(req: NextRequest) {
  try {
    const { login, password, server, platform } = await req.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

    // Create account in MetaAPI
    const createRes = await fetch(`${PROVISIONING}/users/current/accounts`, {
      method: 'POST',
      headers: {
        'auth-token': process.env.METAAPI_TOKEN!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login: String(login),
        password,
        name: profile?.full_name ?? `trader-${user.id.slice(0, 8)}`,
        server,
        platform: platform.toLowerCase(),
        magic: 0,
        application: 'MetaApi',
        type: 'cloud',
      }),
    })

    const accountData = await createRes.json()
    if (!createRes.ok) {
      return NextResponse.json({ error: accountData.message ?? 'MetaAPI connection failed' }, { status: 400 })
    }

    const accountId = accountData.id

    // Deploy the account
    await fetch(`${PROVISIONING}/users/current/accounts/${accountId}/deploy`, {
      method: 'POST',
      headers: { 'auth-token': process.env.METAAPI_TOKEN! },
    })

    // Save to Supabase
    await supabase.from('mt_accounts').upsert({
      master_id: user.id,
      metaapi_account_id: accountId,
      platform: platform.toLowerCase(),
      server,
      login: String(login),
    }, { onConflict: 'master_id' })

    return NextResponse.json({ ok: true, accountId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
