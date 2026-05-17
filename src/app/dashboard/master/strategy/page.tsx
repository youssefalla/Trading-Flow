'use client'

import { useEffect, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

const PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'US30', 'NAS100', 'USOIL', 'XAGUSD']
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1']

interface AIResult {
  score: number
  confirmation: string
  explanation: string
  strengths: string[]
  risks: string[]
}

const confirmationColor: Record<string, string> = {
  'STRONG BUY': '#4ADE80',
  'BUY': '#86EFAC',
  'NEUTRAL': '#C9A84C',
  'SELL': '#FCA5A5',
  'STRONG SELL': '#F87171',
}

export default function StrategyPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    pairs: [] as string[],
    timeframes: [] as string[],
    style: '',
    entry_rules: '',
    risk_management: '',
  })

  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [aiError, setAiError] = useState('')

  // TradingView chart pair
  const [chartPair, setChartPair] = useState('XAUUSD')

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [pRes, sRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('strategies').select('*').eq('master_id', user.id).single(),
      ])

      setProfile(pRes.data)

      if (sRes.data) {
        setForm({
          pairs: sRes.data.pairs ?? [],
          timeframes: sRes.data.timeframes ?? [],
          style: sRes.data.style ?? '',
          entry_rules: sRes.data.entry_rules ?? '',
          risk_management: sRes.data.risk_management ?? '',
        })
        if (sRes.data.ai_score) {
          setAiResult({
            score: sRes.data.ai_score,
            confirmation: sRes.data.ai_confirmation ?? 'NEUTRAL',
            explanation: sRes.data.ai_explanation ?? '',
            strengths: [],
            risks: [],
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function scoreStrategy() {
    if (!form.entry_rules) { setAiError('Please fill in your entry rules first.'); return }
    setScoring(true); setAiError(''); setSaved(false)
    try {
      const res = await fetch('/api/ai/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiResult(data)
      setSaved(true)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setScoring(false)
    }
  }

  function togglePair(p: string) {
    setForm(f => ({ ...f, pairs: f.pairs.includes(p) ? f.pairs.filter(x => x !== p) : [...f.pairs, p] }))
  }
  function toggleTF(t: string) {
    setForm(f => ({ ...f, timeframes: f.timeframes.includes(t) ? f.timeframes.filter(x => x !== t) : [...f.timeframes, t] }))
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

  const scoreColor = aiResult ? (aiResult.score >= 8 ? '#4ADE80' : aiResult.score >= 6 ? '#C9A84C' : '#F87171') : '#C9A84C'

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>Strategy Intelligence</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--tf-subtle)' }}>Build your strategy, get AI scoring, and receive email alerts.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* LEFT — Strategy Builder */}
            <div className="space-y-5">

              {/* Pairs */}
              <div className="rounded-2xl p-6 tf-card-bg">
                <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>Trading Pairs</h2>
                <div className="flex flex-wrap gap-2">
                  {PAIRS.map(p => (
                    <button key={p} onClick={() => togglePair(p)}
                      className="rounded-full px-3 py-1.5 text-xs font-mono transition-all"
                      style={{ border: form.pairs.includes(p) ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: form.pairs.includes(p) ? 'rgba(201,168,76,.15)' : 'transparent', color: form.pairs.includes(p) ? '#C9A84C' : 'var(--tf-muted)' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeframes */}
              <div className="rounded-2xl p-6 tf-card-bg">
                <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>Timeframes</h2>
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAMES.map(t => (
                    <button key={t} onClick={() => toggleTF(t)}
                      className="rounded-full px-3 py-1.5 text-xs font-mono transition-all"
                      style={{ border: form.timeframes.includes(t) ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: form.timeframes.includes(t) ? 'rgba(201,168,76,.15)' : 'transparent', color: form.timeframes.includes(t) ? '#C9A84C' : 'var(--tf-muted)' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div className="rounded-2xl p-6 tf-card-bg">
                <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>Trading Style</h2>
                <div className="grid grid-cols-3 gap-2">
                  {['Scalping', 'Day Trading', 'Swing', 'SMC', 'Price Action', 'ICT'].map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, style: s }))}
                      className="rounded-xl py-2.5 text-xs font-medium transition-all"
                      style={{ border: form.style === s ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: form.style === s ? 'rgba(201,168,76,.1)' : 'transparent', color: form.style === s ? '#C9A84C' : 'var(--tf-muted)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entry Rules */}
              <div className="rounded-2xl p-6 tf-card-bg">
                <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>Entry Rules</h2>
                <p className="text-xs mb-3" style={{ color: 'var(--tf-subtle)' }}>Describe your setup: structure, confluence, triggers…</p>
                <textarea value={form.entry_rules}
                  onChange={e => setForm(f => ({ ...f, entry_rules: e.target.value }))}
                  rows={5} placeholder="e.g. I wait for a market structure break on H4, then look for a BOS on H1 with a 50% FVG entry on M15. Entry confirmed when price closes above previous swing high with volume..."
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none tf-input" />
              </div>

              {/* Risk Management */}
              <div className="rounded-2xl p-6 tf-card-bg">
                <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>Risk Management</h2>
                <textarea value={form.risk_management}
                  onChange={e => setForm(f => ({ ...f, risk_management: e.target.value }))}
                  rows={3} placeholder="e.g. Max 1% risk per trade, 1:3 RR minimum, stop loss always behind structure, max 2 trades per day..."
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none tf-input" />
              </div>

              {aiError && <p className="text-xs font-mono" style={{ color: '#F87171' }}>{aiError}</p>}
              {saved && <p className="text-xs font-mono" style={{ color: '#4ADE80' }}>✓ Strategy saved. Email sent if score ≥ 7.</p>}

              <button onClick={scoreStrategy} disabled={scoring}
                className="btn-gold rounded-xl py-4 text-sm font-semibold w-full">
                {scoring ? 'AI is analyzing your strategy…' : '🤖 Score My Strategy with AI'}
              </button>
            </div>

            {/* RIGHT — AI Result + Chart */}
            <div className="space-y-5">

              {/* AI Score Card */}
              {aiResult ? (
                <div className="rounded-2xl p-6 tf-card-bg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>AI Analysis</h2>
                    <span className="text-xs font-mono px-3 py-1 rounded-full"
                      style={{ background: `${confirmationColor[aiResult.confirmation]}18`, color: confirmationColor[aiResult.confirmation], border: `1px solid ${confirmationColor[aiResult.confirmation]}40` }}>
                      {aiResult.confirmation}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 mb-6">
                    <div className="relative w-24 h-24 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--tf-border)" strokeWidth="2.5"/>
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="2.5"
                          strokeDasharray={`${aiResult.score * 10} 100`} strokeLinecap="round"/>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span style={{ fontFamily: SYS, fontSize: '1.5rem', fontWeight: 700, color: scoreColor }}>{aiResult.score}</span>
                        <span className="text-[10px]" style={{ color: 'var(--tf-subtle)' }}>/10</span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--tf-muted)' }}>{aiResult.explanation}</p>
                  </div>

                  {(aiResult.strengths?.length > 0 || aiResult.risks?.length > 0) && (
                    <div className="grid grid-cols-2 gap-4">
                      {aiResult.strengths?.length > 0 && (
                        <div className="rounded-xl p-4" style={{ background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.15)' }}>
                          <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: '#4ADE80' }}>Strengths</div>
                          {aiResult.strengths.map((s, i) => (
                            <div key={i} className="text-xs mb-1.5 flex gap-2" style={{ color: 'var(--tf-muted)' }}>
                              <span style={{ color: '#4ADE80' }}>✓</span>{s}
                            </div>
                          ))}
                        </div>
                      )}
                      {aiResult.risks?.length > 0 && (
                        <div className="rounded-xl p-4" style={{ background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.15)' }}>
                          <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: '#F87171' }}>Risks</div>
                          {aiResult.risks.map((r, i) => (
                            <div key={i} className="text-xs mb-1.5 flex gap-2" style={{ color: 'var(--tf-muted)' }}>
                              <span style={{ color: '#F87171' }}>⚠</span>{r}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl p-10 tf-card-bg text-center">
                  <div className="text-4xl mb-4">🤖</div>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>No AI score yet</p>
                  <p className="text-xs" style={{ color: 'var(--tf-subtle)' }}>Fill in your strategy and click "Score My Strategy" to get your AI analysis.</p>
                </div>
              )}

              {/* TradingView Chart */}
              <div className="rounded-2xl overflow-hidden tf-card-bg">
                <div className="flex items-center gap-2 p-4 pb-0">
                  <h2 className="text-sm font-semibold flex-1" style={{ color: 'var(--tf-text)' }}>Live Chart</h2>
                  <select value={chartPair} onChange={e => setChartPair(e.target.value)}
                    className="text-xs font-mono rounded-lg px-3 py-1.5 outline-none"
                    style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)', color: 'var(--tf-muted)' }}>
                    {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="p-4">
                  <iframe
                    key={chartPair}
                    src={`https://s.tradingview.com/widgetembed/?frameElementId=tv&symbol=${chartPair}&interval=H1&theme=dark&style=1&locale=en&enable_publishing=false&hide_top_toolbar=false&hide_legend=false&save_image=false&calendar=false&hide_volume=false`}
                    style={{ width: '100%', height: 340, border: 'none', borderRadius: 12 }}
                    allowTransparency
                    allowFullScreen
                  />
                </div>
              </div>

              {/* Score history note */}
              {aiResult && (
                <div className="rounded-2xl p-5 tf-card-bg flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full grid place-items-center shrink-0" style={{ background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.25)' }}>
                    <span style={{ color: '#C9A84C', fontSize: '1.1rem' }}>✉</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--tf-text)' }}>Email alert sent</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>
                      {aiResult.score >= 7 ? 'Your strategy scored ≥ 7 — alert sent to your email.' : 'Score below 7 — no alert sent. Improve your strategy and rescore.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
