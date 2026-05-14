'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Camera } from 'lucide-react'

function SignupForm() {
  const params = useSearchParams()
  const defaultRole = params.get('role') as 'master' | 'trader' || 'trader'
  const [role, setRole] = useState<'master' | 'trader'>(defaultRole)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!avatarFile) { setError('Please upload a profile photo before continuing.'); return }
    setLoading(true); setError('')
    const fd = new FormData(e.currentTarget)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: fd.get('email') as string,
      password: fd.get('password') as string,
      options: { data: { role, full_name: fd.get('name') } },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    const userId = authData.user?.id
    let avatarUrl: string | null = null

    if (userId && avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })

      if (uploadError) {
        setError('Photo upload failed: ' + uploadError.message)
        setLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      avatarUrl = publicUrl
    }

    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: fd.get('name') as string,
        role,
        avatar_url: avatarUrl,
      })
    }

    window.location.href = role === 'master' ? '/onboarding/master' : '/onboarding/trader'
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 tf-page">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14.5" stroke="#C9A84C" strokeWidth="1"/>
              <path d="M22 9 A 11 11 0 1 0 22 23 A 8 8 0 1 1 22 9 Z" fill="#C9A84C"/>
              <path d="M11 21 L21 11 M16 11 H21 V16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-syne)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--tf-text)' }}>
              Trade<span style={{ color: '#C9A84C' }}>Flow</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="rounded-2xl p-8 tf-card-gold">
          <h1 style={{ fontFamily: 'var(--font-syne)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)' }}>Create your account</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--tf-muted)' }}>Join the top copy-trading platform.</p>

          {/* Role selector */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {(['trader', 'master'] as const).map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className="rounded-xl p-4 text-left transition-all"
                style={{
                  border: role === r ? '1px solid #C9A84C' : '1px solid var(--tf-border)',
                  background: role === r ? 'rgba(201,168,76,.1)' : 'var(--tf-card-inner)',
                }}>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--tf-text)' }}>
                  {r === 'master' ? 'Master Trader' : 'Copy Trader'}
                </div>
                <div className="text-xs" style={{ color: 'var(--tf-subtle)' }}>
                  {r === 'master' ? 'Share your signals & earn' : 'Follow top traders automatically'}
                </div>
              </button>
            ))}
          </div>

          {/* Avatar upload */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all overflow-hidden"
              style={{
                border: avatarFile ? '2px solid #C9A84C' : '2px dashed var(--tf-border)',
                background: avatarFile ? 'transparent' : 'var(--tf-card-inner)',
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Camera size={22} style={{ color: 'var(--tf-subtle)' }} />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--tf-subtle)' }}>Photo</span>
                </div>
              )}
              {avatarPreview && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.45)' }}>
                  <Camera size={18} color="white" />
                </div>
              )}
            </button>
            <span className="text-xs font-mono" style={{ color: avatarFile ? '#C9A84C' : 'var(--tf-subtle)' }}>
              {avatarFile ? avatarFile.name : 'Profile photo required'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Full Name</label>
              <input name="name" type="text" required placeholder="Youssef Amrani"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Email</label>
              <input name="email" type="email" required placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--tf-muted)' }}>Password</label>
              <input name="password" type="password" required placeholder="Min 8 characters" minLength={8}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none tf-input"
              />
            </div>
            {error && <p className="text-xs font-mono" style={{ color: '#F87171' }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-gold w-full rounded-xl py-3.5 text-sm font-semibold mt-2">
              {loading ? 'Creating account…' : `Create ${role === 'master' ? 'Master Trader' : 'Copy Trader'} Account`}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--tf-subtle)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium" style={{ color: '#C9A84C' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>
}
