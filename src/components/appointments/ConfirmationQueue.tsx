'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  MapPin,
  Phone,
  UserX,
} from 'lucide-react'
import { format, isToday, isTomorrow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  confirmAppointment,
  updateAppointmentStatus,
} from '@/features/appointments/actions'
import type { AppointmentItem, SiteOption } from './types'
import { getProspectNom, getSiteColor } from './types'

interface Props {
  appointments: AppointmentItem[]
  sites: SiteOption[]
  onReschedule: (appointment: AppointmentItem) => void
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return 'Aujourd’hui'
  if (isTomorrow(d)) return 'Demain'
  return format(d, 'EEEE d MMM', { locale: fr })
}

export default function ConfirmationQueue({ appointments, sites, onReschedule }: Props) {
  const router = useRouter()
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const queue = useMemo(
    () =>
      appointments
        .filter((a) => {
          const statut = overrides[a.id] ?? a.statut
          return statut === 'planifie'
        })
        .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime()),
    [appointments, overrides]
  )

  const confirmedCount = useMemo(
    () =>
      appointments.filter((a) => {
        const statut = overrides[a.id] ?? a.statut
        return statut === 'confirme'
      }).length,
    [appointments, overrides]
  )

  async function handleConfirm(appointment: AppointmentItem) {
    setError(null)
    setBusyId(appointment.id)

    if (appointment.__demo) {
      setOverrides((prev) => ({ ...prev, [appointment.id]: 'confirme' }))
      setBusyId(null)
      return
    }

    const res = await confirmAppointment(appointment.id)
    setBusyId(null)
    if (!res.success) {
      setError(res.error ?? 'Confirmation impossible')
      return
    }
    setOverrides((prev) => ({ ...prev, [appointment.id]: 'confirme' }))
    router.refresh()
  }

  async function handleAbsent(appointment: AppointmentItem) {
    setError(null)
    setBusyId(appointment.id)

    if (appointment.__demo) {
      setOverrides((prev) => ({ ...prev, [appointment.id]: 'absent' }))
      setBusyId(null)
      return
    }

    const res = await updateAppointmentStatus({
      id: appointment.id,
      statut: 'absent',
    })
    setBusyId(null)
    if (!res.success) {
      setError(res.error ?? 'Mise à jour impossible')
      return
    }
    setOverrides((prev) => ({ ...prev, [appointment.id]: 'absent' }))
    router.refresh()
  }

  async function copyLink(appointment: AppointmentItem) {
    if (!appointment.token_public) return
    const base =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== 'undefined' ? window.location.origin : '')
    const url = `${base}/rdv/${appointment.token_public}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(appointment.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setError('Copie impossible — lien : ' + url)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-medium text-gray-500">À confirmer</p>
          <p className="text-2xl font-bold text-amber-600 mt-0.5">{queue.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-medium text-gray-500">Confirmés</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">{confirmedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 col-span-2 sm:col-span-1">
          <p className="text-[11px] font-medium text-gray-500">Prochain RDV</p>
          <p className="text-sm font-bold text-gray-900 mt-1 truncate">
            {queue[0]
              ? `${format(new Date(queue[0].debut), 'dd/MM HH:mm')} — ${getProspectNom(queue[0])}`
              : 'Aucun en attente'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-800">
            Tous les rendez-vous sont confirmés
          </p>
          <p className="text-xs text-gray-400 mt-1">
            La file de confirmation J-1 est vide. Les nouveaux rendez-vous apparaîtront ici
            automatiquement.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {queue.map((appt) => {
            const color = getSiteColor(appt.site_id, sites)
            const busy = busyId === appt.id
            return (
              <div
                key={appt.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-gray-200 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div
                    className={`shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center ${color.soft} ${color.text}`}
                  >
                    <span className="text-[10px] font-semibold uppercase">
                      {format(new Date(appt.debut), 'MMM', { locale: fr })}
                    </span>
                    <span className="text-xl font-bold leading-none">
                      {format(new Date(appt.debut), 'dd')}
                    </span>
                    <span className="text-[10px] font-semibold tabular-nums mt-0.5">
                      {format(new Date(appt.debut), 'HH:mm')}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900">
                        {getProspectNom(appt)}
                      </p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {dayLabel(appt.debut)}
                      </span>
                      {appt.google_event_id && (
                        <span className="text-[10px] font-medium text-brand-600">
                          Google Agenda
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {appt.site?.nom ?? 'Site non défini'}
                        {appt.site?.ville ? ` — ${appt.site.ville}` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {format(new Date(appt.debut), 'HH:mm')} –{' '}
                        {format(new Date(appt.fin), 'HH:mm')}
                      </span>
                      {appt.assigne_a && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                          <CalendarClock className="w-3 h-3 text-gray-400" />
                          {[appt.assigne_a.prenom, appt.assigne_a.nom]
                            .filter(Boolean)
                            .join(' ')}
                        </span>
                      )}
                    </div>
                    {appt.lead?.telephone && (
                      <a
                        href={`tel:${appt.lead.telephone}`}
                        className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 font-medium mt-1"
                      >
                        <Phone className="w-3 h-3" />
                        {appt.lead.telephone}
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      onClick={() => handleConfirm(appt)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Confirmer
                    </button>
                    <button
                      onClick={() => onReschedule(appt)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      Replanifier
                    </button>
                    <button
                      onClick={() => handleAbsent(appt)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-medium rounded-lg transition-colors"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Absent
                    </button>
                    {appt.token_public && (
                      <button
                        onClick={() => copyLink(appt)}
                        title="Copier le lien de confirmation prospect"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {copiedId === appt.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}