// ============================================================
// OTOCLIC CRM — Abstraction Téléphonie
// Interface unique pour brancher tel:, Twilio, Aircall, 3CX…
// ============================================================

export type CallResult = {
  providerId: string
  status: 'initiated' | 'ringing' | 'connected' | 'failed'
  error?: string
}

export type CallStatus = {
  providerId: string
  status: 'idle' | 'ringing' | 'connected' | 'ended'
  duration?: number
  recordingUrl?: string
}

export type CallEvent = {
  type: 'call_started' | 'call_ended' | 'call_failed' | 'recording_available'
  providerId: string
  timestamp: Date
  data?: Record<string, unknown>
}

export interface TelephonyProvider {
  initiateCall(
    leadPhone: string,
    agentExtension?: string,
    metadata?: Record<string, unknown>
  ): Promise<CallResult>

  hangup(callId: string): Promise<void>

  getCallStatus(callId: string): Promise<CallStatus>

  onCallEvent(handler: (event: CallEvent) => void): () => void

  isAvailable(): boolean

  readonly providerName: string
}

export class TelLinkProvider implements TelephonyProvider {
  readonly providerName = 'tel-link'
  private eventHandlers: ((event: CallEvent) => void)[] = []

  isAvailable(): boolean {
    return true
  }

  async initiateCall(
    leadPhone: string,
    _agentExtension?: string,
    _metadata?: Record<string, unknown>
  ): Promise<CallResult> {
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${leadPhone}`
    }

    const providerId = `tel-${Date.now()}`
    
    const event: CallEvent = {
      type: 'call_started',
      providerId,
      timestamp: new Date(),
      data: { phone: leadPhone },
    }
    this.eventHandlers.forEach(h => h(event))

    return {
      providerId,
      status: 'initiated',
    }
  }

  async hangup(_callId: string): Promise<void> {
    const event: CallEvent = {
      type: 'call_ended',
      providerId: _callId,
      timestamp: new Date(),
    }
    this.eventHandlers.forEach(h => h(event))
  }

  async getCallStatus(callId: string): Promise<CallStatus> {
    return {
      providerId: callId,
      status: 'idle',
    }
  }

  onCallEvent(handler: (event: CallEvent) => void): () => void {
    this.eventHandlers.push(handler)
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler)
    }
  }
}

let _instance: TelephonyProvider | null = null

export function getTelephonyProvider(): TelephonyProvider {
  if (_instance) return _instance

  const providerName = process.env.NEXT_PUBLIC_TELEPHONY_PROVIDER ?? 'tel-link'

  switch (providerName) {
    case 'tel-link':
    default:
      _instance = new TelLinkProvider()
      break
  }

  return _instance
}

