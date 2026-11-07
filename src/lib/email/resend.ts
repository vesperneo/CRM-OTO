// ============================================================
// OTOCLIC CRM — Emails transactionnels (Resend)
// ============================================================

export interface EmailSendInput {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailSendResult {
  success: boolean
  provider: string
  demo?: boolean
  messageId?: string
  error?: string
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
  if (!isEmailConfigured()) {
    return {
      success: true,
      provider: 'demo',
      demo: true,
      messageId: `demo-mail-${Date.now()}`,
    }
  }

  const from = `${process.env.RESEND_FROM_NAME ?? 'Otoclic CRM'} <${
    process.env.RESEND_FROM_EMAIL ?? 'crm@otoclic.ma'
  }>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })

    const json: any = await res.json().catch(() => ({}))

    if (!res.ok) {
      return {
        success: false,
        provider: 'resend',
        error: json?.message ?? `Erreur email (${res.status})`,
      }
    }

    return { success: true, provider: 'resend', messageId: json?.id }
  } catch (error) {
    return {
      success: false,
      provider: 'resend',
      error: error instanceof Error ? error.message : 'Erreur réseau email',
    }
  }
}

export function buildAppointmentEmail(params: {
  prenom?: string | null
  date: string
  heure: string
  siteNom: string
  siteAdresse?: string | null
  siteVille?: string | null
  siteTelephone?: string | null
  mapsUrl?: string | null
  tokenPublic: string
  appUrl?: string
}): { subject: string; html: string; text: string } {
  const appUrl = params.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const confirmationUrl = `${appUrl}/rdv/${params.tokenPublic}`
  const adresse = [params.siteAdresse, params.siteVille].filter(Boolean).join(', ')

  const subject = `Confirmation de votre rendez-vous Otoclic — ${params.date} à ${params.heure}`

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
    <div style="background:#da3655;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:18px">Otoclic CRM</h1>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:24px">
      <p>Bonjour ${params.prenom ?? ''},</p>
      <p>Votre rendez-vous est bien planifié :</p>
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#6b7280">Date</td><td style="font-weight:bold">${params.date} à ${params.heure}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280">Showroom</td><td style="font-weight:bold">${params.siteNom}</td></tr>
        ${adresse ? `<tr><td style="padding:8px 0;color:#6b7280">Adresse</td><td>${adresse}</td></tr>` : ''}
        ${params.siteTelephone ? `<tr><td style="padding:8px 0;color:#6b7280">Téléphone</td><td>${params.siteTelephone}</td></tr>` : ''}
      </table>
      <p style="margin:24px 0">
        <a href="${confirmationUrl}" style="background:#16a34a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;display:inline-block">Confirmer ma présence</a>
      </p>
      <p style="font-size:12px;color:#6b7280">Si vous ne pouvez pas venir, merci de nous prévenir via le bouton ci-dessus.</p>
      <p style="font-size:12px;color:#6b7280">Otoclic — votre mobilité, simplifiée.</p>
    </div>
  </div>`

  const text = [
    `Bonjour ${params.prenom ?? ''},`,
    `Votre rendez-vous Otoclic est planifié le ${params.date} à ${params.heure}.`,
    `Showroom : ${params.siteNom}${adresse ? ` — ${adresse}` : ''}`,
    `Confirmer votre présence : ${confirmationUrl}`,
  ].join('\n')

  return { subject, html, text }
}