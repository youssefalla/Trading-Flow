'use client'

import { useEffect, useState } from 'react'
import { CopySidebar } from '@/components/CopySidebar'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

export default function CopySettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setName(data?.full_name ?? '')
      setLoading(false)
    }
    load()
  }, [])

  async function saveName() {
    setSaving(true); setSaved(false)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ full_name: name }).eq('id', user.id)
    setProfile(p => p ? { ...p, full_name: name } : p)
    setSaving(false); setSaved(true)
  }

  async function signOut() {
    setSigningOut(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

  const init = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <CopySidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-xl mx-auto">
          <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }} className="mb-8">Settings</h1>

          <div className="space-y-5">
            <div className="rounded-2xl p-6 tf-card-bg flex items-center gap-4">
              <div className="w-14 h-14 rounded-full grid place-items-center font-bold text-xl shrink-0 overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: SYS }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : init}
              </div>
              <div>
                <div className="font-semibold" style={{ color: 'var(--tf-text)' }}>{profile?.full_name ?? '—'}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>Copy Trader</div>
              </div>
            </div>

            <div className="rounded-2xl p-6 tf-card-bg">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--tf-text)' }}>Display Name</h2>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input mb-4" />
              {saved && <p className="text-xs font-mono mb-3" style={{ color: '#4ADE80' }}>Saved.</p>}
              <button onClick={saveName} disabled={saving} className="btn-gold rounded-xl px-6 py-2.5 text-sm font-semibold">
                {saving ? 'Saving…' : 'Save Name'}
              </button>
            </div>

            <div className="rounded-2xl p-6 tf-card-bg">
              <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>Account</h2>
              <p className="text-xs mb-4" style={{ color: 'var(--tf-subtle)' }}>Signed in as Copy Trader</p>
              <button onClick={signOut} disabled={signingOut}
                className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-all"
                style={{ border: '1px solid rgba(248,113,113,.4)', color: '#F87171', background: 'rgba(248,113,113,.06)' }}>
                {signingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
