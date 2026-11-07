// ============================================================
// OTOCLIC CRM — Synchronisation Google Calendar (REST API)
// ============================================================
// Variables d'environnement :
//   GOOGLE_CALENDAR_ACCESS_TOKEN (OAuth 2.0 access token valide)
//   GOOGLE_CALENDAR_ID (défaut : primary)
// ============================================================

export interface GoogleEventInput {
  summary: string
  description?: string
  location?: string
  start: string
  end: string
  timeZone?: string
  attendees?: { email: string }[]
}

export interface GoogleEventResult {
  success: boolean
  demo?: boolean
  eventId?: string
  htmlLink?: string
  error?: string
}

const API_BASE = 'https://www.googleapis.com/calendar/v3'

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CALENDAR_ACCESS_TOKEN)
}

function calendarId(): string {
  return encodeURIComponent(process.env.GOOGLE_CALENDAR_ID ?? 'primary')
}

export async function createGoogleEvent(
  input: GoogleEventInput
): Promise<GoogleEventResult> {
  if (!isGoogleCalendarConfigured()) {
    return { success: true, demo: true, eventId: `demo-gcal-${Date.now()}` }
  }

  try {
    const res = await fetch(
      `${API_BASE}/calendars/${calendarId()}/events?conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GOOGLE_CALENDAR_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: {
            dateTime: input.start,
            timeZone: input.timeZone ?? 'Africa/Casablanca',
          },
          end: {
            dateTime: input.end,
            timeZone: input.timeZone ?? 'Africa/Casablanca',
          },
          attendees: input.attendees,
        }),
      }
    )

    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        error: json?.error?.message ?? `Erreur Google Calendar (${res.status})`,
      }
    }

    return { success: true, eventId: json.id, htmlLink: json.htmlLink }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur réseau Google Calendar',
    }
  }
}

export async function updateGoogleEvent(
  eventId: string,
  input: Partial<GoogleEventInput>
): Promise<GoogleEventResult> {
  if (!isGoogleCalendarConfigured() || eventId.startsWith('demo-')) {
    return { success: true, demo: true, eventId }
  }

  try {
    const res = await fetch(
      `${API_BASE}/calendars/${calendarId()}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.GOOGLE_CALENDAR_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: input.start
            ? { dateTime: input.start, timeZone: 'Africa/Casablanca' }
            : undefined,
          end: input.end
            ? { dateTime: input.end, timeZone: 'Africa/Casablanca' }
            : undefined,
        }),
      }
    )

    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        success: false,
        error: json?.error?.message ?? `Erreur Google Calendar (${res.status})`,
      }
    }

    return { success: true, eventId: json.id, htmlLink: json.htmlLink }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur réseau Google Calendar',
    }
  }
}

export async function deleteGoogleEvent(eventId: string): Promise<GoogleEventResult> {
  if (!isGoogleCalendarConfigured() || eventId.startsWith('demo-')) {
    return { success: true, demo: true }
  }

  try {
    const res = await fetch(
      `${API_BASE}/calendars/${calendarId()}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.GOOGLE_CALENDAR_ACCESS_TOKEN}`,
        },
      }
    )

    if (!res.ok && res.status !== 404) {
      return { success: false, error: `Erreur Google Calendar (${res.status})` }
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur réseau Google Calendar',
    }
  }
}