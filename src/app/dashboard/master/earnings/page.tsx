'use client'

import { useEffect, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile, Gig, Trade } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

export default function EarningsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [gig, setGig] = useState<Gig | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const [pRes, gRes, tRes, fRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('gigs').select('*').eq('master_id', user.id).single(),
        supabase.from('trades').select('*').eq('master_id', user.id),
        supabase.from('follows').select('id', { count: 'exact' }).eq('master_id', user.id),
      ])
      setProfile(pRes.data)
      setGig(gRes.data)
      setTrades(tRes.data ?? [])
      setFollowerCount(fRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  const fee = gig?.performance_fee ?? 0
  const winTrades = trades.filter(t => t.result === 'WIN').length
  const totalPips = trades.reduce((s, t) => s + (t.pnl_pips ?? 0), 0)
  const estimatedMonthly = Math.round(followerCount * 500 * fee / 100)

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }} className="mb-8">Earnings</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Performance Fee', value: `${fee}%`, color: '#C9A84C' },
              { label: 'Followers', value: String(followerCount), color: 'var(--tf-text)' },
              { label: 'Total Pips', value: totalPips > 0 ? `+${totalPips}` : String(totalPips), color: totalPips >= 0 ? '#4ADE80' : '#F87171' },
              { label: 'Win Trades', value: String(winTrades), color: '#4ADE80' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl p-5 tf-card-bg">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-subtle)' }}>{label}</div>
                <div style={{ fontFamily: SYS, fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-6 tf-card-bg mb-6">
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>Estimated Monthly Earnings</h2>
            <div style={{ fontFamily: SYS, fontSize: '2.5rem', fontWeight: 700, color: '#C9A84C' }}>${estimatedMonthly.toLocaleString()}</div>
            <p className="mt-3 text-sm" style={{ color: 'var(--tf-subtle)' }}>
              Based on {followerCount} follower{followerCount !== 1 ? 's' : ''} × avg $500 profit × {fee}% fee
            </p>
          </div>

          <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,.12), rgba(201,168,76,.04))', border: '1px solid rgba(201,168,76,.25)' }}>
            <div className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>Grow your earnings</div>
            <p className="text-sm" style={{ color: 'var(--tf-muted)' }}>Increase your follower count by sharing your gig link and keeping your ROI consistent.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
