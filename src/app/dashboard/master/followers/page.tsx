'use client'

import { useEffect, useState } from 'react'
import { MasterSidebar } from '@/components/MasterSidebar'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

interface Follower {
  trader_id: string
  created_at: string
  profiles: { full_name: string; avatar_url: string | null } | null
}

export default function FollowersPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [followers, setFollowers] = useState<Follower[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const [pRes, fRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('follows').select('trader_id, created_at, profiles!trader_id(full_name, avatar_url)').eq('master_id', user.id).order('created_at', { ascending: false }),
      ])
      setProfile(pRes.data)
      setFollowers((fRes.data ?? []) as unknown as Follower[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center tf-page"><div className="text-sm font-mono" style={{ color: 'var(--tf-subtle)' }}>Loading…</div></div>

  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <MasterSidebar profile={profile} onAvatarChange={url => setProfile(p => p ? { ...p, avatar_url: url } : p)} />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>Followers</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--tf-subtle)' }}>{followers.length} trader{followers.length !== 1 ? 's' : ''} copying you</p>
          </div>

          {followers.length === 0 ? (
            <div className="rounded-2xl p-12 text-center tf-card-bg">
              <p className="text-sm" style={{ color: 'var(--tf-subtle)' }}>No followers yet. Share your gig link to attract traders.</p>
            </div>
          ) : (
            <div className="rounded-2xl tf-card-bg overflow-hidden">
              {followers.map((f, i) => {
                const init = f.profiles?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
                return (
                  <div key={f.trader_id} className="flex items-center gap-4 px-6 py-4"
                    style={{ borderBottom: i < followers.length - 1 ? '1px solid var(--tf-border)' : 'none' }}>
                    <div className="w-10 h-10 rounded-full grid place-items-center font-bold shrink-0 overflow-hidden"
                      style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: SYS }}>
                      {f.profiles?.avatar_url ? <img src={f.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : init}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: 'var(--tf-text)' }}>{f.profiles?.full_name ?? '—'}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--tf-subtle)' }}>Joined {new Date(f.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-xs font-mono px-2 py-1 rounded-full" style={{ background: 'rgba(74,222,128,.1)', color: '#4ADE80' }}>Active</div>
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
