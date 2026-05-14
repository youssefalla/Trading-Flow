'use client'

import { useEffect, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile, Trade } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

export default function TradesPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [form, setForm] = useState({ pair: '', direction: 'BUY' as 'BUY' | 'SELL', pnl_pips: '', result: 'WIN' as 'WIN' | 'LOSS' | 'OPEN' })
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUserId(user.id)
      const [pRes, tRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('trades').select('*').eq('master_id', user.id).order('opened_at', { ascending: false }),
      ])
      setProfile(pRes.data)
      setTrades(tRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function addTrade() {
    if (!form.pair || !userId) return
    setAdding(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('trades').insert({
        master_id: userId,
        pair: form.pair.toUpperCase(),
        direction: form.direction,
        pnl_pips: parseFloat(form.pnl_pips) || 0,
        result: form.result,
        opened_at: new Date().toISOString(),
      }).select().single()
      if (error) throw error
      setTrades(t => [data, ...t])
      setForm({ pair: '', direction: 'BUY', pnl_pips: '', result: 'WIN' })
      setShowForm(false)
    } finally {
      setAdding(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>My Trades</h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--tf-subtle)' }}>{trades.length} trades recorded</p>
            </div>
            <button onClick={() => setShowForm(s => !s)} className="btn-gold rounded-xl px-5 py-2.5 text-sm font-semibold">+ Add Trade</button>
          </div>

          {showForm && (
            <div className="rounded-2xl p-6 mb-6 tf-card-bg">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>New Trade</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Pair</label>
                  <input value={form.pair} onChange={e => setForm(f => ({ ...f, pair: e.target.value }))} placeholder="XAUUSD" className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input" />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Pips</label>
                  <input type="number" value={form.pnl_pips} onChange={e => setForm(f => ({ ...f, pnl_pips: e.target.value }))} placeholder="25" className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input" />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Direction</label>
                  <div className="flex gap-2">
                    {(['BUY', 'SELL'] as const).map(d => (
                      <button key={d} onClick={() => setForm(f => ({ ...f, direction: d }))}
                        className="flex-1 rounded-xl py-3 text-sm font-mono font-semibold transition-all"
                        style={{ border: form.direction === d ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: form.direction === d ? 'rgba(201,168,76,.1)' : 'transparent', color: form.direction === d ? '#C9A84C' : 'var(--tf-muted)' }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Result</label>
                  <div className="flex gap-2">
                    {(['WIN', 'LOSS', 'OPEN'] as const).map(r => (
                      <button key={r} onClick={() => setForm(f => ({ ...f, result: r }))}
                        className="flex-1 rounded-xl py-3 text-xs font-mono font-semibold transition-all"
                        style={{ border: form.result === r ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: form.result === r ? 'rgba(201,168,76,.1)' : 'transparent', color: form.result === r ? '#C9A84C' : 'var(--tf-muted)' }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={addTrade} disabled={adding || !form.pair} className="btn-gold rounded-xl px-6 py-2.5 text-sm font-semibold">
                {adding ? 'Adding…' : 'Add Trade'}
              </button>
            </div>
          )}

          {trades.length === 0 ? (
            <div className="rounded-2xl p-12 text-center tf-card-bg">
              <p className="text-sm" style={{ color: 'var(--tf-subtle)' }}>No trades yet. Add your first trade above.</p>
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
                    <div className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>{new Date(t.opened_at).toLocaleDateString()} · {t.pnl_pips > 0 ? '+' : ''}{t.pnl_pips} pips</div>
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
