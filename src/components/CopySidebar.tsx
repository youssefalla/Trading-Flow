'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LayoutDashboard, Users, TrendingUp, BookOpen, Settings } from 'lucide-react'
import type { Profile } from '@/types/database'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',  href: '/dashboard/copy' },
  { icon: Users,           label: 'My Traders', href: '/dashboard/copy/traders' },
  { icon: TrendingUp,      label: 'My Trades',  href: '/dashboard/copy/trades' },
  { icon: BookOpen,        label: 'Courses',    href: '/dashboard/copy/courses' },
  { icon: Settings,        label: 'Settings',   href: '/dashboard/copy/settings' },
]

export function CopySidebar() {
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    load()
  }, [])

  const init = profile?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <aside className="w-64 hidden md:flex flex-col p-6 gap-6 shrink-0 tf-sidebar">
      <Link href="/" className="flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/><path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/><path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span style={{ fontFamily: SYS, fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.02em' }}>Trade<span style={{ color: '#C9A84C' }}>Flow</span></span>
      </Link>

      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.2)' }}>
        <div className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-3 font-bold text-xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#E0C26A,#C9A84C)', color: '#1F2329', fontFamily: SYS }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            : init}
        </div>
        <div className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>{profile?.full_name ?? '—'}</div>
        <div className="text-xs mt-0.5" style={{ color: '#C9A84C' }}>Copy Trader</div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname === href
          return (
            <Link key={label} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{ background: active ? 'rgba(201,168,76,.12)' : 'transparent', color: active ? '#C9A84C' : 'var(--tf-muted)', border: active ? '1px solid rgba(201,168,76,.2)' : '1px solid transparent' }}>
              <Icon size={16} strokeWidth={1.7} /><span>{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center justify-between">
        <Link href="/marketplace" className="btn-gold rounded-xl py-2 px-4 text-sm font-semibold text-center flex-1 mr-2">+ Add Trader</Link>
        <ThemeToggle />
      </div>
    </aside>
  )
}
