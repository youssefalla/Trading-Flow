'use client'

import { useEffect, useState } from 'react'
import { CopySidebar } from '@/components/CopySidebar'
import type { Trade } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

export default function MyTradesPage() {
  const [trades, setTrades] = useState<Trade[]>([])
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
        const { data } = await supabase.from('trades').select('*').in('master_id', masterIds).order('opened_at', { ascending: false })
        setTrades(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const closed = trades.filter(t => t.result !== 'OPEN')
  const wins = closed.filter(t => t.result === 'WIN').length
  const winRate = closed.length ? Math.round(wins / closed.length * 100) : 0
  const totalPips = trades.reduce((s, t) => s + (t.pnl_pips ?? 0), 0)

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <CopySidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }} className="mb-8">My Trades</h1>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total Pips', value: totalPips > 0 ? `+${totalPips}` : String(totalPips), color: totalPips >= 0 ? '#4ADE80' : '#F87171' },
              { label: 'Win Rate', value: closed.length ? `${winRate}%` : '—', color: '#C9A84C' },
              { label: 'Total Trades', value: String(trades.length), color: 'var(--tf-text)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl p-5 tf-card-bg">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--tf-subtle)' }}>{label}</div>
                <div style={{ fontFamily: SYS, fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {trades.length === 0 ? (
            <div className="rounded-2xl p-12 text-center tf-card-bg">
              <p className="text-sm" style={{ color: 'var(--tf-subtle)' }}>No trades copied yet. Follow a master trader to start.</p>
            </div>
          ) : (
            <div className="rounded-2xl tf-card-bg overflow-hidden">
              {trades.map((t, i) => (
                <div key={t.id} className="flex items-center gap-4 px-6 py-4"
                  style={{ borderBottom: i < trades.length - 1 ? '1px solid var(--tf-border)' : 'none' }}>
                  <div className="w-9 h-9 rounded-lg grid place-items-center text-sm font-bold shrink-0"
                    style={{ background: t.direction === 'BUY' ? 'rgba(34,197,94,.12)' : 'rgba(248,113,113,.12)', color: t.direction === 'BUY' ? '#4ADE80' : '#F87171' }}>
                    {t.direction === 'BUY' ? '↑' : '↓'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>{t.pair}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>
                      {new Date(t.opened_at).toLocaleDateString()} · {t.pnl_pips > 0 ? '+' : ''}{t.pnl_pips} pips
                    </div>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: t.result === 'WIN' ? '#4ADE80' : t.result === 'LOSS' ? '#F87171' : 'var(--tf-muted)' }}>{t.result}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
