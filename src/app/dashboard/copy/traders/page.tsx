'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CopySidebar } from '@/components/CopySidebar'
import type { Gig } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

export default function MyTradersPage() {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data: follows } = await supabase.from('follows').select('master_id').eq('trader_id', user.id)
      const masterIds = (follows ?? []).map(f => f.master_id)
      if (masterIds.length > 0) {
        const { data } = await supabase.from('gigs').select('*, profiles(*)').in('master_id', masterIds)
        setGigs((data ?? []) as Gig[])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function unfollow(masterId: string) {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('follows').delete().eq('trader_id', user.id).eq('master_id', masterId)
    setGigs(g => g.filter(x => x.master_id !== masterId))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <CopySidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>My Traders</h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--tf-subtle)' }}>{gigs.length} trader{gigs.length !== 1 ? 's' : ''} you are copying</p>
            </div>
            <Link href="/marketplace" className="btn-gold rounded-xl px-5 py-2.5 text-sm font-semibold">+ Add Trader</Link>
          </div>

          {gigs.length === 0 ? (
            <div className="rounded-2xl p-12 text-center tf-card-bg">
              <p className="text-sm mb-4" style={{ color: 'var(--tf-subtle)' }}>You are not following any traders yet.</p>
              <Link href="/marketplace" className="btn-gold rounded-full px-6 py-2.5 text-sm font-semibold">Browse Marketplace</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {gigs.map(gig => {
                const p = gig.profiles
                const init = p?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
                return (
                  <div key={gig.id} className="flex items-center gap-4 p-5 rounded-2xl tf-card-bg">
                    <div className="w-12 h-12 rounded-full grid place-items-center font-bold shrink-0 overflow-hidden"
                      style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: SYS }}>
                      {p?.avatar_url ? <img src={p.avatar_url} alt={p.full_name ?? ''} className="w-full h-full object-cover" /> : init}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" style={{ color: 'var(--tf-text)' }}>{p?.full_name ?? '—'}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>{gig.style ?? 'Trader'} · {gig.performance_fee}% fee</div>
                    </div>
                    <div className="text-right mr-4">
                      <div style={{ color: '#4ADE80', fontWeight: 600 }}>{gig.roi_30d > 0 ? `+${gig.roi_30d}%` : '—'}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>30D ROI</div>
                    </div>
                    <button onClick={() => unfollow(gig.master_id)}
                      className="rounded-xl px-4 py-2 text-xs font-mono transition-all"
                      style={{ border: '1px solid rgba(248,113,113,.3)', color: '#F87171', background: 'rgba(248,113,113,.06)' }}>
                      Unfollow
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
