import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAppUrl } from '@/lib/app-url'

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function welcomeEmailHtml(name: string, appUrl: string): string {
  const eName = escapeHtml(name)
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;line-height:1.6;color:#1F2937;max-width:560px;margin:0 auto;padding:24px;background:#F9FAFB;">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-flex;align-items:center;gap:8px;">
        <div style="height:32px;width:32px;background:linear-gradient(135deg,#8A6BFF 0%,#6B8CFF 100%);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:16px;">⚡</div>
        <span style="font-size:18px;font-weight:bold;color:#111827;">RelanceFlow</span>
      </div>
    </div>

    <h1 style="font-size:22px;color:#111827;margin:0 0 12px 0;">Bienvenue, ${eName} !</h1>
    <p style="font-size:15px;color:#374151;margin:0 0 16px 0;">
      Tu viens de débloquer <strong>30 jours d&rsquo;essai gratuit</strong> pour automatiser
      tes relances et reprendre le contrôle de ta trésorerie. Pas de carte bancaire requise.
    </p>

    <p style="font-size:15px;color:#374151;margin:0 0 16px 0;">
      Pour démarrer en moins de 5 minutes :
    </p>

    <ol style="font-size:14px;color:#374151;padding-left:20px;line-height:1.8;">
      <li><strong>Configure ton entreprise</strong> (1 min) — nom, SIREN, adresse pour générer des factures conformes.</li>
      <li><strong>Crée ta première facture</strong> ou importe ton fichier CSV existant (Sage, Pennylane, QuickBooks…).</li>
      <li><strong>Active les relances auto</strong> — les emails partent à J+7, J+15, J+30 sans aucune action de ta part.</li>
    </ol>

    <div style="text-align:center;margin:32px 0;">
      <a href="${escapeHtml(appUrl)}/dashboard" style="background:linear-gradient(135deg,#8A6BFF 0%,#6B8CFF 100%);color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
        Démarrer maintenant →
      </a>
    </div>

    <div style="border-top:1px solid #E5E7EB;padding-top:20px;margin-top:24px;">
      <p style="font-size:13px;color:#6B7280;margin:0 0 8px 0;"><strong>Une question ?</strong></p>
      <p style="font-size:13px;color:#6B7280;margin:0;">
        Réponds directement à cet email — tu parles au fondateur, pas à un bot.
      </p>
    </div>

    <div style="margin-top:32px;text-align:center;">
      <p style="font-size:11px;color:#9CA3AF;margin:0;">
        RelanceFlow · Outil français pour les indépendants français.<br/>
        <a href="${escapeHtml(appUrl)}/dashboard/settings" style="color:#9CA3AF;text-decoration:underline;">Préférences</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

function welcomeEmailText(name: string, appUrl: string): string {
  return `Bienvenue ${name} !

Tu viens de débloquer 30 jours d'essai gratuit sur RelanceFlow.

Pour démarrer en 5 minutes :
1. Configure ton entreprise (1 min)
2. Crée ou importe tes factures
3. Active les relances auto (J+7, J+15, J+30)

Démarrer maintenant : ${appUrl}/dashboard

Une question ? Réponds à cet email — tu parles au fondateur.

—
RelanceFlow
`
}

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    // Atomic claim — UPDATE … WHERE welcome_email_sent_at IS NULL returns the
    // updated row only to the first concurrent caller. Subsequent callers get
    // no row back and short-circuit. Prevents duplicate emails when /auth/confirm
    // and OnboardingWizard mount both fire-and-forget POST to this route.
    const nowIso = new Date().toISOString()
    const { data: claimed, error: claimErr } = await supabase
      .from('profiles')
      .update({ welcome_email_sent_at: nowIso } as never)
      .eq('id', user.id)
      .is('welcome_email_sent_at', null)
      .select('company_name, email')
      .maybeSingle()

    if (claimErr) {
      console.error('welcome claim error:', claimErr)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // No row returned → another concurrent request already claimed the send.
    if (!claimed) {
      return NextResponse.json({ ok: true, already_sent: true })
    }

    const p = claimed as { company_name: string | null; email: string | null }
    const targetEmail = p.email || user.email
    if (!targetEmail) {
      return NextResponse.json({ error: 'Pas d\'email cible' }, { status: 400 })
    }

    const appUrl = getAppUrl()
    const name = p.company_name || targetEmail.split('@')[0]

    // Send via Resend if API key configured. If send fails, roll back the
    // sent-at flag so the next attempt can retry.
    if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('placeholder')) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'relances@relanceflow.fr'
        await resend.emails.send({
          from: `RelanceFlow <${fromEmail}>`,
          to: [targetEmail],
          subject: 'Bienvenue sur RelanceFlow — 30 jours pour automatiser vos relances',
          html: welcomeEmailHtml(name, appUrl),
          text: welcomeEmailText(name, appUrl),
          // Second safety net on top of the atomic DB claim above —
          // Resend dedupes identical-key requests for 24h.
          headers: { 'Idempotency-Key': `welcome-${user.id}` },
          tags: [{ name: 'type', value: 'welcome' }],
        })
      } catch (emailErr) {
        console.error('Welcome email send error:', emailErr)
        // Roll back the claim so the next attempt can retry.
        await supabase
          .from('profiles')
          .update({ welcome_email_sent_at: null } as never)
          .eq('id', user.id)
        return NextResponse.json({ ok: false, sent: false }, { status: 200 })
      }
    }

    // welcome_email_sent_at is already set by the atomic claim above.
    return NextResponse.json({ ok: true, sent: true })
  } catch (err) {
    console.error('welcome route error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
