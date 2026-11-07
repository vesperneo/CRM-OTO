// ============================================================
// OTOCLIC CRM — WhatsApp Cloud API (Meta)
// ============================================================

export interface WhatsAppSendInput {
  to: string
  body?: string
  templateName?: string
  language?: string
  templateParams?: string[]
}

export interface WhatsAppSendResult {
  success: boolean
  provider: string
  demo?: boolean
  messageId?: string
  error?: string
}

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION ?? 'v20.0'

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  )
}

export function normalizeWhatsAppRecipient(phone: string): string {
  let digits = phone.replace(/[^\d]/g, '')
  if (digits.startsWith('00212')) digits = digits.slice(2)
  if (digits.startsWith('0') && digits.length === 10) digits = '212' + digits.slice(1)
  if (!digits.startsWith('212') && digits.length === 9) digits = '212' + digits
  return digits
}

export async function sendWhatsAppMessage(
  input: WhatsAppSendInput
): Promise<WhatsAppSendResult> {
  if (!isWhatsAppConfigured()) {
    return {
      success: true,
      provider: 'demo',
      demo: true,
      messageId: `demo-wa-${Date.now()}`,
    }
  }

  const to = normalizeWhatsAppRecipient(input.to)
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`

  const payload = input.templateName
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: input.templateName,
          language: { code: input.language ?? 'fr' },
          components: input.templateParams?.length
            ? [
                {
                  type: 'body',
                  parameters: input.templateParams.map((text) => ({
                    type: 'text',
                    text,
                  })),
                },
              ]
            : [],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { preview_url: true, body: input.body ?? '' },
      }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const json: any = await res.json().catch(() => ({}))

    if (!res.ok) {
      return {
        success: false,
        provider: 'whatsapp-cloud',
        error: json?.error?.message ?? `Erreur WhatsApp (${res.status})`,
      }
    }

    return {
      success: true,
      provider: 'whatsapp-cloud',
      messageId: json?.messages?.[0]?.id,
    }
  } catch (error) {
    return {
      success: false,
      provider: 'whatsapp-cloud',
      error: error instanceof Error ? error.message : 'Erreur réseau WhatsApp',
    }
  }
}

/** Remplace les variables {{...}} d'un modèle texte. */
export function renderWhatsAppTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key]
    return value === null || value === undefined ? '' : String(value)
  })
}