'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, User, X } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { createAppointment, rescheduleAppointment } from '@/features/appointments/actions'
import { APPOINTMENT_TYPES } from '@/lib/constants'
import type {
  AppointmentItem,
  LeadOption,
  ProfileOption,
  SiteOption,
} from './types'
import { getProspectNom } from './types'

interface Props {
  isOpen: boolean
  onClose: () => void
  leads: LeadOption[]
  sites: SiteOption[]
  profiles: ProfileOption[]
  defaultDate?: string | null
  appointment?: AppointmentItem | null
  isDemo?: boolean
  onSuccess?: () => void
  onLocalCreate?: (data: {
    lead_id: string
    site_id: string | null
    assigne_a_id: string | null
    type: string
    debutIso: string
    duree: number
    notes: string | null
  }) => void
  onLocalReschedule?: (id: string, debutIso: string, duree: number) => void
}

function defaultSlot() {
  const d = addDays(new Date(), 1)
  return { date: format(d, 'yyyy-MM-dd'), time: '10:00' }
}

export default function AppointmentFormModal({
  isOpen,
  onClose,
  leads,
  sites,
  profiles,
  defaultDate,
  appointment,
  isDemo,
  onSuccess,
  onLocalCreate,
  onLocalReschedule,
}: Props) {
  const router = useRouter()
  const slot = defaultSlot()

  const [leadId, setLeadId] = useState('')
  const [siteId, setSiteId] = useState('')
  const [assigneId, setAssigneId] = useState('')
  const [type, setType] = useState('showroom')
  const [date, setDate] = useState(defaultDate ?? slot.date)
  const [time, setTime] = useState(slot.time)
  const [duree, setDuree] = useState(60)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null)

    if (appointment) {
      const debut = new Date(appointment.debut)
      setDate(format(debut, 'yyyy-MM-dd'))
      setTime(format(debut, 'HH:mm'))
      const minutes = Math.max(
        15,
        Math.round((new Date(appointment.fin).getTime() - debut.getTime()) / 60_000)
      )
      setDuree(minutes)
      setLeadId(appointment.lead_id)
      setSiteId(appointment.site_id ?? '')
      setAssigneId(appointment.assigne_a_id ?? '')
      setType(appointment.type)
      setNotes(appointment.notes_crc ?? '')
      return
    }

    setLeadId('')
    setSiteId('')
    setAssigneId('')
    setType('showroom')
    setDate(defaultDate ?? slot.date)
    setTime(slot.time)
    setDuree(60)
    setNotes('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, appointment, defaultDate])

  if (!isOpen) return null

  const isReschedule = Boolean(appointment)

  function handleLeadChange(id: string) {
    setLeadId(id)
    const lead = leads.find((l) => l.id === id)
    if (lead?.site_prefere_id) {
      setSiteId(lead.site_prefere_id)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!date || !time) {
      setError('Veuillez renseigner la date et l’heure du rendez-vous.')
      return
    }

    const debutIso = new Date(`${date}T${time}:00`).toISOString()

    if (isDemo) {
      if (isReschedule && appointment) {
        onLocalReschedule?.(appointment.id, debutIso, duree)
      } else if (leadId) {
        onLocalCreate?.({
          lead_id: leadId,
          site_id: siteId || null,
          assigne_a_id: assigneId || null,
          type,
          debutIso,
          duree,
          notes: notes || null,
        })
      }
      onClose()
      return
    }

    setLoading(true)

    if (isReschedule && appointment) {
      const res = await rescheduleAppointment(appointment.id, debutIso, duree)
      setLoading(false)
      if (!res.success) {
        setError(res.error ?? 'Reprogrammation impossible')
        return
      }
      onSuccess?.()
      router.refresh()
      onClose()
      return
    }

    if (!leadId) {
      setLoading(false)
      setError('Veuillez sélectionner un prospect.')
      return
    }

    const res = await createAppointment({
      lead_id: leadId,
      site_id: siteId || null,
      assigne_a_id: assigneId || null,
      type: type as 'showroom' | 'appel' | 'visio',
      debut: debutIso,
      duree_minutes: duree,
      notes_crc: notes || null,
    })

    setLoading(false)

    if (!res.success) {
      setError(res.error ?? 'Création impossible')
      return
    }

    onSuccess?.()
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">
                {isReschedule ? 'Reprogrammer le rendez-vous' : 'Planifier un rendez-vous'}
              </h3>
              <p className="text-xs text-gray-400">
                {isReschedule
                  ? getProspectNom(appointment!)
                  : 'Créneau showroom, appel ou visio'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {!isReschedule && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Prospect *
              </label>
              <select
                value={leadId}
                onChange={(e) => handleLeadChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">Sélectionner un prospect…</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {[l.prenom, l.nom].filter(Boolean).join(' ')} — {l.telephone}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <MapPin className="w-3 h-3 inline mr-1 text-gray-400" />
                Showroom / site
              </label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">Non défini</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                    {s.ville ? ` (${s.ville})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <User className="w-3 h-3 inline mr-1 text-gray-400" />
                Commercial
              </label>
              <select
                value={assigneId}
                onChange={(e) => setAssigneId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">Non assigné</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {[p.prenom, p.nom].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Type de rendez-vous
            </label>
            <div className="flex gap-2">
              {APPOINTMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    type === t.value
                      ? 'bg-brand-50 border-brand-300 text-brand-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-1">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <Calendar className="w-3 h-3 inline mr-1 text-gray-400" />
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <Clock className="w-3 h-3 inline mr-1 text-gray-400" />
                Heure *
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Durée
              </label>
              <select
                value={duree}
                onChange={(e) => setDuree(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 h</option>
                <option value={90}>1 h 30</option>
                <option value={120}>2 h</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Notes CRC
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Modèle souhaité, contraintes horaires, rappel de qualification…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-2"
            >
              {loading ? 'Enregistrement…' : isReschedule ? 'Reprogrammer' : 'Créer le rendez-vous'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}