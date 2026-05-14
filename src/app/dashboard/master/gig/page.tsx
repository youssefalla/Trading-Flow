'use client'

import { useEffect, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile, Gig } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'
const INSTRUMENTS = ['Forex', 'Gold', 'Indices', 'Crypto', 'Oil', 'Stocks']

export default function GigProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [gig, setGig] = useState<Gig | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ city: '', bio: '', style: '', instruments: [] as string[], fee: '10' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const [pRes, gRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('gigs').select('*').eq('master_id', user.id).single(),
      ])
      setProfile(pRes.data)
      if (gRes.data) {
        setGig(gRes.data)
        const parts = gRes.data.style?.split(' · ') ?? []
        const knownStyles = ['Scalping', 'Day Trading', 'Swing']
        const style = parts.find((p: string) => knownStyles.includes(p)) ?? ''
        setForm({
          city: pRes.data?.city ?? '',
          bio: pRes.data?.bio ?? '',
          style,
          instruments: gRes.data.instruments ?? [],
          fee: String(gRes.data.performance_fee ?? 10),
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      await supabase.from('profiles').update({ city: form.city || null, bio: form.bio || null }).eq('id', user.id)
      const { error: gErr } = await supabase.from('gigs').upsert({
        master_id: user.id,
        style: [form.style, ...form.instruments].filter(Boolean).join(' · ') || null,
        instruments: form.instruments,
        performance_fee: parseInt(form.fee),
        is_active: true,
      }, { onConflict: 'master_id' })
      if (gErr) throw gErr
      setSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }} className="mb-8">Gig Profile</h1>

          <div className="space-y-6">
            <div className="rounded-2xl p-6 tf-card-bg">
              <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--tf-text)' }}>About You</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Casablanca" className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input" />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Bio</label>
                  <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={4} placeholder="Tell followers about your trading experience…" className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none tf-input" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-6 tf-card-bg">
              <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--tf-text)' }}>Trading Style</h2>
              <div className="flex flex-wrap gap-2 mb-5">
                {INSTRUMENTS.map(inst => {
                  const sel = form.instruments.includes(inst)
                  return (
                    <button key={inst} onClick={() => setForm(f => ({ ...f, instruments: sel ? f.instruments.filter(x => x !== inst) : [...f.instruments, inst] }))}
                      className="rounded-full px-4 py-2 text-sm font-mono transition-all"
                      style={{ border: sel ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: sel ? 'rgba(201,168,76,.15)' : 'transparent', color: sel ? '#C9A84C' : 'var(--tf-muted)' }}>
                      {inst}
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['Scalping', 'Day Trading', 'Swing'].map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, style: s }))}
                    className="rounded-xl p-3 text-sm font-medium transition-all"
                    style={{ border: form.style === s ? '1px solid #C9A84C' : '1px solid var(--tf-border)', background: form.style === s ? 'rgba(201,168,76,.1)' : 'var(--tf-card-inner)', color: form.style === s ? '#C9A84C' : 'var(--tf-muted)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-6 tf-card-bg">
              <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--tf-text)' }}>Performance Fee</h2>
              <div className="flex items-center gap-4 mb-3">
                <input type="range" min="5" max="30" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} className="flex-1 accent-[#C9A84C]" />
                <div style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: '#C9A84C', minWidth: 60 }}>{form.fee}%</div>
              </div>
              <p className="text-xs" style={{ color: 'var(--tf-subtle)' }}>You earn this % from your followers&apos; monthly profits.</p>
            </div>

            {error && <p className="text-xs font-mono" style={{ color: '#F87171' }}>{error}</p>}
            {saved && <p className="text-xs font-mono" style={{ color: '#4ADE80' }}>Saved successfully.</p>}
            <button onClick={save} disabled={saving} className="btn-gold rounded-xl py-3.5 px-8 text-sm font-semibold">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
