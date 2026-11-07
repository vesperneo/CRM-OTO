'use client'

import { useState } from 'react'
import {
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'

export interface PublicAppointment {
  id: string
  debut: string
  fin: string
  type: string
  statut: string
  token_public: string
  notes_crc?: string | null
  site?: {
    id?: string
    nom: string
    ville?: string | null
    adresse?: string | null
    telephone?: string | null
  } | null
  lead?: { prenom?: string | null; nom?: string | null; telephone?: string | null } | null
  commercial?: { prenom?: string | null; nom?: string | null } | null
}

interface Props {
  appointment: PublicAppointment
  isDemo?: boolean
}

function mapsUrl(site: PublicAppointment['site']): string | null {
  if (!site) return null
  const query = [site.adresse, site.ville, site.nom].filter(Boolean).join(', ')
  if (!query) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export default function PublicAppointmentView({ appointment, isDemo }: Props) {
  const [statut, setStatut] = useState(appointment.statut)
  const [busy, setBusy] = useState<'confirmer' | 'annuler' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const prospect = [appointment.lead?.prenom, appointment.lead?.nom]
    .filter(Boolean)
    .join(' ')
  const commercial = [appointment.commercial?.prenom, appointment.commercial?.nom]
    .filter(Boolean)
    .join(' ')
  const map = mapsUrl(appointment.site)

  async function handleAction(action: 'confirmer' | 'annuler') {
    setError(null)
    setMessage(null)
    setBusy(action)

    if (isDemo) {
      setStatut(action === 'confirmer' ? 'confirme' : 'annule')
      setBusy(null)
      setMessage(
        action === 'confirmer'
          ? 'Votre présence est confirmée. Merci !'
          : 'Votre rendez-vous a bien été annulé.'
      )
      return
    }

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc(
      'confirm_appointment_by_token',
      { p_token: appointment.token_public, p_action: action }
    )

    setBusy(null)

    if (rpcError) {
      setError('Une erreur est survenue. Merci de nous contacter par téléphone.')
      return
    }

    const result = data as Record<string, unknown> | null
    if (!result || result.success !== true) {
      setError(String(result?.error ?? 'Action impossible sur ce rendez-vous.'))
      return
    }

    setStatut(action === 'confirmer' ? 'confirme' : 'annule')
    setMessage(
      action === 'confirmer'
        ? 'Votre présence est confirmée. Merci !'
        : 'Votre rendez-vous a bien été annulé.'
    )
  }

  const isFinal = ['annule', 'effectue', 'absent'].includes(statut)

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 shadow-sm">
            <span className="w-6 h-6 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
              O
            </span>
            <span className="text-sm font-bold text-gray-900">Otoclic</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Votre rendez-vous showroom</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
          <div
            className={`px-6 py-5 ${
              statut === 'confirme'
                ? 'bg-emerald-600'
                : statut === 'annule' || statut === 'absent'
                ? 'bg-gray-700'
                : 'bg-brand-600'
            } text-white`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">
                  {prospect ? `Bonjour ${prospect}` : 'Bonjour'}
                </p>
                <p className="text-lg font-bold mt-1">
                  {statut === 'confirme'
                    ? 'Rendez-vous confirmé'
                    : statut === 'annule'
                    ? 'Rendez-vous annulé'
                    : statut === 'effectue'
                    ? 'Rendez-vous effectué'
                    : statut === 'absent'
                    ? 'Rendez-vous non honoré'
                    : 'Merci de confirmer votre présence'}
                </p>
              </div>
              {statut === 'confirme' ? (
                <CalendarCheck className="w-10 h-10 opacity-90" />
              ) : statut === 'annule' || statut === 'absent' ? (
                <CalendarX className="w-10 h-10 opacity-90" />
              ) : (
                <Clock className="w-10 h-10 opacity-90" />
              )}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Date
                </p>
                <p className="text-sm font-bold text-gray-900 capitalize mt-0.5">
                  {format(new Date(appointment.debut), 'EEEE d MMMM', { locale: fr })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Horaire
                </p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">
                  {format(new Date(appointment.debut), 'HH:mm')} –{' '}
                  {format(new Date(appointment.fin), 'HH:mm')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-100">
              <MapPin className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900">
                  {appointment.site?.nom ?? 'Showroom Otoclic'}
                </p>
                <p className="text-[11px] text-gray-500">
                  {[appointment.site?.adresse, appointment.site?.ville]
                    .filter(Boolean)
                    .join(', ') || 'Adresse communiquée par votre conseiller'}
                </p>
                {map && (
                  <a
                    href={map}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[11px] font-semibold text-brand-600 hover:text-brand-700 mt-1"
                  >
                    Ouvrir dans Google Maps →
                  </a>
                )}
              </div>
            </div>

            {commercial && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-600">
                  Votre conseiller :{' '}
                  <span className="font-semibold text-gray-900">{commercial}</span>
                </p>
              </div>
            )}

            {appointment.site?.telephone && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <a
                  href={`tel:${appointment.site.telephone}`}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  {appointment.site.telephone}
                </a>
              </div>
            )}

            {message && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!isFinal && statut !== 'confirme' && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleAction('confirmer')}
                  disabled={busy !== null}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {busy === 'confirmer' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Je confirme ma présence
                </button>
                <button
                  onClick={() => handleAction('annuler')}
                  disabled={busy !== null}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-600 text-sm font-medium rounded-xl transition-colors"
                >
                  {busy === 'annuler' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CalendarX className="w-4 h-4" />
                  )}
                  Je ne peux pas venir
                </button>
              </div>
            )}

            {statut === 'confirme' && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-emerald-700 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Votre présence est confirmée. Nous vous attendons à l’horaire indiqué.
                  </span>
                </div>
                <button
                  onClick={() => handleAction('annuler')}
                  disabled={busy !== null}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-medium rounded-xl transition-colors"
                >
                  {busy === 'annuler' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CalendarX className="w-3.5 h-3.5" />
                  )}
                  Annuler le rendez-vous
                </button>
              </div>
            )}

            {isFinal && (
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl text-gray-600 text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                <span>
                  Ce rendez-vous ne peut plus être modifié en ligne. Contactez votre
                  showroom pour reprogrammer un créneau.
                </span>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">
              Vos données sont traitées par Otoclic conformément à la loi 09-08 (CNDP).
              <br />
              Pour toute question, contactez votre showroom.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}