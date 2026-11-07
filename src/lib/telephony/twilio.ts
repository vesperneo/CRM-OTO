// ============================================================
// OTOCLIC CRM — Téléphonie VoIP (Twilio Programmable Voice)
// ============================================================
// Variables d'environnement :
//   TELEPHONY_PROVIDER=twilio
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
//   TWILIO_AGENT_NUMBER (numéro du poste agent, optionnel)
// ============================================================

export interface VoipCallResult {
  success: boolean
  provider: string
  demo?: boolean
  providerCallId?: string
  status?: string
  error?: string
}

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  )
}

export function getTelephonyProviderName(): string {
  if (process.env.TELEPHONY_PROVIDER === 'twilio' && isTwilioConfigured()) {
    return 'twilio'
  }
  return 'tel-link'
}

export async function initiateTwilioCall(params: {
  to: string
  agentNumber?: string
  leadId?: string
  record?: boolean
  twimlUrl?: string
}): Promise<VoipCallResult> {
  if (!isTwilioConfigured()) {
    return {
      success: true,
      provider: 'tel-link',
      demo: true,
      providerCallId: `demo-call-${Date.now()}`,
      status: 'initiated',
    }
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  const from = process.env.TWILIO_FROM_NUMBER!
  const agent = params.agentNumber ?? process.env.TWILIO_AGENT_NUMBER

  const body = new URLSearchParams()
  body.set('To', params.to)
  body.set('From', from)
  body.set('Record', params.record ? 'true' : 'false')

  if (params.twimlUrl) {
    body.set('Url', params.twimlUrl)
  } else if (agent) {
    // Sonne d'abord le poste de l'agent, puis connecte le prospect.
    body.set(
      'Twiml',
      `<Response><Dial callerId="${from}">${params.to}</Dial></Response>`
    )
  } else {
    body.set(
      'Twiml',
      `<Response><Say language="fr-FR">Connexion en cours avec le prospect.</Say><Dial callerId="${from}">${params.to}</Dial></Response>`
    )
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    )

    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        provider: 'twilio',
        error: json?.message ?? `Erreur Twilio (${res.status})`,
      }
    }

    return {
      success: true,
      provider: 'twilio',
      providerCallId: json.sid,
      status: json.status,
    }
  } catch (error) {
    return {
      success: false,
      provider: 'twilio',
      error: error instanceof Error ? error.message : 'Erreur réseau Twilio',
    }
  }
}