import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { title, coachName } = await req.json()

    // Get all master trader emails
    const { data: masters } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'master')

    if (!masters?.length) return NextResponse.json({ ok: true })

    // Get their emails from auth
    const emails: string[] = []
    for (const m of masters) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(m.id)
      if (user?.email) emails.push(user.email)
    }

    if (!emails.length) return NextResponse.json({ ok: true })

    const liveUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/master/live`

    // Send batch emails
    await Promise.all(
      emails.map(email =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'TradeFlow <alerts@tradeflow.app>',
            to: email,
            subject: `🔴 ${coachName ?? 'Your Coach'} is live now — ${title}`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background: #0A0C0F; color: #F0EDE8; padding: 40px; border-radius: 16px;">
                <div style="margin-bottom: 32px;">
                  <span style="font-size: 24px; font-weight: 700;">Trade<span style="color: #C9A84C;">Flow</span></span>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.3); border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background: #F87171; flex-shrink: 0; animation: pulse 1s infinite;"></div>
                  <div>
                    <div style="font-size: 12px; font-weight: 600; color: #F87171; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">Live Now</div>
                    <div style="font-size: 18px; font-weight: 700; color: #F0EDE8;">${title}</div>
                  </div>
                </div>

                <p style="color: rgba(240,237,232,.6); font-size: 15px; margin-bottom: 32px;">
                  <strong style="color: #F0EDE8;">${coachName ?? 'Your coach'}</strong> just started a live analysis session. Join now to watch in real time.
                </p>

                <a href="${liveUrl}"
                  style="display: block; background: linear-gradient(135deg,#E0C26A,#C9A84C); color: #1F2329; text-align: center; padding: 16px; border-radius: 999px; font-weight: 700; text-decoration: none; font-size: 15px;">
                  Join Live Session →
                </a>

                <p style="margin-top: 28px; font-size: 12px; color: rgba(240,237,232,.3); text-align: center;">
                  TradeFlow · Live Sessions
                </p>
              </div>
            `,
          }),
        })
      )
    )

    return NextResponse.json({ ok: true, sent: emails.length })
  } catch (e) {
    console.error('Live alert error:', e)
    return NextResponse.json({ ok: true })
  }
}
