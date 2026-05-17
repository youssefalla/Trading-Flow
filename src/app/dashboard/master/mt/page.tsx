'use client'

import { useEffect, useState, useCallback } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'
import { RefreshCw, Wifi, WifiOff, TrendingUp, TrendingDown, Wallet, BarChart3, Activity } from 'lucide-react'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

interface AccountInfo {
  balance: number
  equity: number
  profit: number
  margin: number
  marginLevel: number
  leverage: number
  currency: string
  broker: string
  server: string
}

interface Position {
  id: string
  symbol: string
  type: string
  volume: number
  openPrice: number
  currentPrice: number
  profit: number
  swap: number
}

interface Deal {
  id: string
  symbol?: string
  type: string
  entryType?: string
  profit: number
  time: string
  volume?: number
}

interface Stats {
  info: AccountInfo | null
  positions: Position[]
  deals: Deal[]
  account: { platform: string; server: string; login: string }
}

// Simple bar chart using SVG
function BarChart({ deals }: { deals: Deal[] }) {
  const closed = deals
    .filter(d => d.entryType === 'DEAL_ENTRY_OUT' && d.symbol)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  if (closed.length < 2) return (
    <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--tf-subtle)' }}>
      Not enough trade data
    </div>
  )

  // Group by month or by week
  const groups: Record<string, number> = {}
  closed.forEach(d => {
    const key = new Date(d.time).toLocaleDateString('en-US', { month: 'short' })
    groups[key] = (groups[key] ?? 0) + d.profit
  })
  const entries = Object.entries(groups).slice(-7)
  const max = Math.max(...entries.map(([, v]) => Math.abs(v)), 1)

  return (
    <div className="flex items-end gap-2 h-full w-full px-2">
      {entries.map(([label, value]) => {
        const isPos = value >= 0
        const height = Math.max((Math.abs(value) / max) * 100, 6)
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full rounded-t-lg transition-all"
              style={{ height: `${height}%`, background: isPos ? 'linear-gradient(180deg, #4ADE80, rgba(74,222,128,.3))' : 'linear-gradient(180deg, #F87171, rgba(248,113,113,.3))' }} />
            <span className="text-[10px] font-mono" style={{ color: 'var(--tf-subtle)' }}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function MTDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsError, setStatsError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [hasAccount, setHasAccount] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')
  const [form, setForm] = useState({ login: '', password: '', server: '', platform: 'MT5' })

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const [pRes, mtRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('mt_accounts').select('id').eq('master_id', user.id).single(),
      ])

      setProfile(pRes.data)
      if (mtRes.data) { setHasAccount(true); fetchStats() }
      else setLoading(false)
    }
    load()
  }, [])

  const fetchStats = useCallback(async () => {
    setRefreshing(true); setStatsError('')
    try {
      const res = await fetch('/api/mt/stats')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStats(data)
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : 'Failed to fetch stats')
    } finally { setRefreshing(false); setLoading(false) }
  }, [])

  async function connectAccount() {
    if (!form.login || !form.password || !form.server) { setConnectError('All fields are required.'); return }
    setConnecting(true); setConnectError('')
    try {
      const res = await fetch('/api/mt/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setHasAccount(true); setLoading(true)
      setTimeout(() => fetchStats(), 5000)
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Connection failed')
    } finally { setConnecting(false) }
  }

  const closedDeals = stats?.deals.filter(d => d.entryType === 'DEAL_ENTRY_OUT' && d.symbol) ?? []
  const winners = closedDeals.filter(d => d.profit > 0).length
  const winRate = closedDeals.length ? Math.round((winners / closedDeals.length) * 100) : 0
  const totalProfit = closedDeals.reduce((s, d) => s + d.profit, 0)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center tf-page">
      <div className="text-center space-y-2">
        <div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>{hasAccount ? 'Connecting to MetaTrader…' : 'Loading…'}</div>
        {hasAccount && <div className="text-xs" style={{ color: 'var(--tf-subtle)' }}>This may take up to 30s on first load.</div>}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--tf-subtle)' }}>
                <span>TradeFlow</span><span>/</span><span style={{ color: 'var(--tf-text)' }}>MT Dashboard</span>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>Overview</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>Here is the summary of your trading account</p>
            </div>
            {hasAccount && (
              <button onClick={fetchStats} disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all"
                style={{ border: '1px solid var(--tf-border)', color: 'var(--tf-muted)', background: 'var(--tf-card-inner)' }}>
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            )}
          </div>

          {/* ── NOT CONNECTED ── */}
          {!hasAccount && (
            <div className="max-w-md mx-auto rounded-2xl p-8 tf-card-bg" style={{ border: '1px solid rgba(201,168,76,.25)' }}>
              <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                style={{ background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.2)' }}>
                <WifiOff size={22} color="#C9A84C" />
              </div>
              <h2 className="text-center text-base font-semibold mb-1" style={{ color: 'var(--tf-text)' }}>Connect MetaTrader</h2>
              <p className="text-center text-xs mb-7" style={{ color: 'var(--tf-subtle)' }}>Link your MT4 or MT5 to see live stats.</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {['MT4', 'MT5'].map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, platform: p }))}
                      className="rounded-xl py-2.5 text-sm font-medium transition-all"
                      style={{ border: form.platform === p ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: form.platform === p ? 'rgba(201,168,76,.1)' : 'transparent', color: form.platform === p ? '#C9A84C' : 'var(--tf-muted)' }}>
                      {p}
                    </button>
                  ))}
                </div>
                <input value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))} placeholder="Account Login" className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input" />
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input" />
                <input value={form.server} onChange={e => setForm(f => ({ ...f, server: e.target.value }))} placeholder="Server (e.g. ICMarkets-Demo)" className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input" />
                {connectError && <p className="text-xs font-mono" style={{ color: '#F87171' }}>{connectError}</p>}
                <button onClick={connectAccount} disabled={connecting} className="btn-gold rounded-xl py-3.5 text-sm font-semibold w-full">
                  {connecting ? 'Connecting…' : 'Connect Account →'}
                </button>
              </div>
            </div>
          )}

          {/* ── CONNECTED ── */}
          {hasAccount && stats?.info && (
            <>
              {/* Connection badge */}
              <div className="flex items-center gap-2 text-xs" style={{ color: '#4ADE80' }}>
                <Wifi size={12} />
                <span className="font-mono">{stats.account.platform.toUpperCase()} · {stats.account.server} · #{stats.account.login}</span>
              </div>

              {/* ── 3 Overview Cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Balance */}
                <div className="rounded-2xl p-6 relative overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(201,168,76,.18) 0%, rgba(201,168,76,.06) 100%)', border: '1px solid rgba(201,168,76,.3)' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: 'rgba(201,168,76,.2)' }}>
                      <Wallet size={18} color="#C9A84C" />
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full" style={{ background: 'rgba(74,222,128,.15)', color: '#4ADE80', border: '1px solid rgba(74,222,128,.2)' }}>
                      Live ↑
                    </span>
                  </div>
                  <div className="text-xs mb-1" style={{ color: 'rgba(201,168,76,.7)' }}>Account Balance</div>
                  <div style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: '#C9A84C', letterSpacing: '-0.03em' }}>
                    {stats.info.currency} {stats.info.balance?.toLocaleString('en', { minimumFractionDigits: 2 })}
                  </div>
                  <button className="mt-4 text-xs font-medium flex items-center gap-1" style={{ color: 'rgba(201,168,76,.7)' }}>
                    See details →
                  </button>
                </div>

                {/* Equity */}
                <div className="rounded-2xl p-6 tf-card-bg" style={{ border: '1px solid var(--tf-border)' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: stats.info.equity >= stats.info.balance ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)' }}>
                      <BarChart3 size={18} color={stats.info.equity >= stats.info.balance ? '#4ADE80' : '#F87171'} />
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full"
                      style={{ background: stats.info.equity >= stats.info.balance ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)', color: stats.info.equity >= stats.info.balance ? '#4ADE80' : '#F87171', border: `1px solid ${stats.info.equity >= stats.info.balance ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'}` }}>
                      {stats.info.equity >= stats.info.balance ? '+' : ''}{((stats.info.equity - stats.info.balance) / stats.info.balance * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs mb-1" style={{ color: 'var(--tf-subtle)' }}>Equity</div>
                  <div style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>
                    {stats.info.currency} {stats.info.equity?.toLocaleString('en', { minimumFractionDigits: 2 })}
                  </div>
                  <button className="mt-4 text-xs font-medium flex items-center gap-1" style={{ color: 'var(--tf-subtle)' }}>
                    View summary →
                  </button>
                </div>

                {/* 30D P&L */}
                <div className="rounded-2xl p-6 tf-card-bg" style={{ border: '1px solid var(--tf-border)' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: totalProfit >= 0 ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)' }}>
                      <Activity size={18} color={totalProfit >= 0 ? '#4ADE80' : '#F87171'} />
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(201,168,76,.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,.2)' }}>
                      {winRate}% WR
                    </span>
                  </div>
                  <div className="text-xs mb-1" style={{ color: 'var(--tf-subtle)' }}>30D Net P&L</div>
                  <div style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: totalProfit >= 0 ? '#4ADE80' : '#F87171', letterSpacing: '-0.03em' }}>
                    {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
                  </div>
                  <button className="mt-4 text-xs font-medium flex items-center gap-1" style={{ color: 'var(--tf-subtle)' }}>
                    Analyze performance →
                  </button>
                </div>
              </div>

              {/* ── Middle Row ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Open Positions — like "My Wallet" */}
                <div className="rounded-2xl p-6 tf-card-bg" style={{ border: '1px solid var(--tf-border)' }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Open Positions</h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>Live market exposure</p>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(201,168,76,.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,.2)' }}>
                      {stats.positions.length} open
                    </span>
                  </div>

                  {stats.positions.length === 0 ? (
                    <div className="py-8 text-center text-sm" style={{ color: 'var(--tf-subtle)' }}>No open positions right now.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {stats.positions.slice(0, 4).map(pos => {
                        const isBuy = pos.type === 'POSITION_TYPE_BUY'
                        const isProfit = pos.profit >= 0
                        return (
                          <div key={pos.id} className="rounded-xl p-4" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)' }}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-8 h-8 rounded-lg grid place-items-center"
                                style={{ background: isBuy ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)' }}>
                                {isBuy ? <TrendingUp size={14} color="#4ADE80" /> : <TrendingDown size={14} color="#F87171" />}
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                                style={{ background: isProfit ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)', color: isProfit ? '#4ADE80' : '#F87171', border: `1px solid ${isProfit ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'}` }}>
                                {isProfit ? '+' : ''}{pos.profit?.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-sm font-semibold font-mono" style={{ color: 'var(--tf-text)' }}>{pos.symbol}</div>
                            <div className="text-xs mt-1" style={{ color: 'var(--tf-subtle)' }}>{pos.volume} lots · @ {pos.openPrice}</div>
                            <div className="text-[10px] mt-1 font-mono" style={{ color: isProfit ? '#4ADE80' : '#F87171' }}>
                              {isBuy ? 'BUY' : 'SELL'} · {pos.type === 'POSITION_TYPE_BUY' ? 'Long' : 'Short'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Monthly P&L Chart — like "Cash Flow" */}
                <div className="rounded-2xl p-6 tf-card-bg" style={{ border: '1px solid var(--tf-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>P&L Flow</h2>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>Monthly performance</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'var(--tf-card-inner)', border: '1px solid var(--tf-border)', color: 'var(--tf-muted)' }}>Monthly</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: SYS, fontSize: '1.5rem', fontWeight: 700, color: totalProfit >= 0 ? '#4ADE80' : '#F87171', letterSpacing: '-0.02em', marginBottom: 20 }}>
                    {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} <span className="text-sm font-normal" style={{ color: 'var(--tf-subtle)' }}>{stats.info.currency}</span>
                  </div>
                  <div style={{ height: 140 }}>
                    <BarChart deals={stats.deals} />
                  </div>
                </div>
              </div>

              {/* ── Recent Trades Table ── */}
              <div className="rounded-2xl p-6 tf-card-bg" style={{ border: '1px solid var(--tf-border)' }}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Recent Trades</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>Last 30 days closed positions</p>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--tf-subtle)' }}>{closedDeals.length} trades</span>
                </div>

                {closedDeals.length === 0 ? (
                  <div className="py-8 text-center text-sm" style={{ color: 'var(--tf-subtle)' }}>No closed trades in the last 30 days.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--tf-border)' }}>
                          {['Symbol', 'Date', 'Volume', 'P&L', 'Status'].map(h => (
                            <th key={h} className="text-left pb-3 text-xs uppercase tracking-widest" style={{ color: 'var(--tf-subtle)', fontWeight: 500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {closedDeals.slice(-10).reverse().map((d, i) => (
                          <tr key={d.id ?? i} style={{ borderBottom: '1px solid var(--tf-border)' }}>
                            <td className="py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg grid place-items-center text-xs font-bold"
                                  style={{ background: d.profit > 0 ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)', color: d.profit > 0 ? '#4ADE80' : '#F87171' }}>
                                  {d.symbol?.slice(0, 2) ?? '—'}
                                </div>
                                <span className="font-mono font-medium text-sm" style={{ color: 'var(--tf-text)' }}>{d.symbol ?? '—'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 text-xs" style={{ color: 'var(--tf-subtle)' }}>
                              {new Date(d.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                            </td>
                            <td className="py-3.5 font-mono text-xs" style={{ color: 'var(--tf-muted)' }}>{d.volume ?? '—'}</td>
                            <td className="py-3.5 font-mono font-semibold text-sm" style={{ color: d.profit > 0 ? '#4ADE80' : '#F87171' }}>
                              {d.profit > 0 ? '+' : ''}{d.profit?.toFixed(2)}
                            </td>
                            <td className="py-3.5">
                              <span className="text-[11px] px-2.5 py-1 rounded-full font-mono"
                                style={{ background: d.profit > 0 ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)', color: d.profit > 0 ? '#4ADE80' : '#F87171', border: `1px solid ${d.profit > 0 ? 'rgba(74,222,128,.2)' : 'rgba(248,113,113,.2)'}` }}>
                                {d.profit > 0 ? 'Win' : 'Loss'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error state */}
          {hasAccount && statsError && (
            <div className="rounded-2xl p-10 tf-card-bg text-center" style={{ border: '1px solid var(--tf-border)' }}>
              <WifiOff size={32} className="mx-auto mb-3" style={{ color: '#F87171' }} />
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>Could not fetch account data</p>
              <p className="text-xs mb-5" style={{ color: 'var(--tf-subtle)' }}>{statsError}</p>
              <button onClick={fetchStats} className="btn-gold rounded-xl px-6 py-2.5 text-sm font-semibold">Try Again</button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
