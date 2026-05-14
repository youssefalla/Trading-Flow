'use client'

import { CopySidebar } from '@/components/CopySidebar'

const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif'

const COURSES = [
  { title: 'SMC Fundamentals', level: 'Beginner', duration: '4h', locked: false },
  { title: 'Order Flow & Liquidity', level: 'Intermediate', duration: '6h', locked: true },
  { title: 'Risk Management Mastery', level: 'Beginner', duration: '3h', locked: false },
  { title: 'Advanced Price Action', level: 'Advanced', duration: '8h', locked: true },
  { title: 'Psychology of Trading', level: 'Beginner', duration: '2h', locked: false },
  { title: 'Gold & Forex Deep Dive', level: 'Intermediate', duration: '5h', locked: true },
]

const levelColor: Record<string, string> = {
  Beginner: '#4ADE80',
  Intermediate: '#C9A84C',
  Advanced: '#F87171',
}

export default function CoursesPage() {
  return (
    <div className="min-h-screen flex tf-page" style={{ fontFamily: SYS }}>
      <CopySidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 style={{ fontFamily: SYS, fontSize: '1.75rem', fontWeight: 700, color: 'var(--tf-text)', letterSpacing: '-0.03em' }}>Courses</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--tf-subtle)' }}>Learn to trade like a master. Free & Pro courses.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {COURSES.map(c => (
              <div key={c.title} className="rounded-2xl p-5 tf-card-bg flex flex-col gap-3"
                style={{ opacity: c.locked ? 0.6 : 1 }}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>{c.title}</h3>
                  {c.locked && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: 'rgba(201,168,76,.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,.3)' }}>Pro</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: `${levelColor[c.level]}18`, color: levelColor[c.level] }}>{c.level}</span>
                  <span className="text-xs" style={{ color: 'var(--tf-subtle)' }}>{c.duration}</span>
                </div>
                <button disabled={c.locked}
                  className="rounded-xl py-2.5 text-sm font-semibold transition-all mt-auto"
                  style={{ background: c.locked ? 'var(--tf-border)' : 'rgba(201,168,76,.15)', color: c.locked ? 'var(--tf-subtle)' : '#C9A84C', border: c.locked ? 'none' : '1px solid rgba(201,168,76,.3)' }}>
                  {c.locked ? '🔒 Unlock with Pro' : 'Start Course →'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
