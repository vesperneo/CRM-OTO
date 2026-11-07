'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Link2,
  List,
  Loader2,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  UserX,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  confirmAppointment,
  deleteAppointment,
  syncAppointmentToGoogle,
  updateAppointmentStatus,
} from '@/features/appointments/actions'
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '@/lib/constants'
import { downloadCsv, downloadExcel, printReport, todaySlug } from '@/lib/export'
import AppointmentsCalendar from './AppointmentsCalendar'
import ConfirmationQueue from './ConfirmationQueue'
import AppointmentFormModal from './AppointmentFormModal'
import type {
  AppointmentItem,
  LeadOption,
  ProfileOption,
  SiteOption,
} from './types'
import { getProspectNom, getSiteColor } from './types'

interface Props {
  initialAppointments: AppointmentItem[]
  sites: SiteOption[]
  leads: LeadOption[]
  profiles: ProfileOption[]
  isDemo?: boolean
}

type Tab = 'calendar' | 'confirmations' | 'list'

function statusBadge(statut: string) {
  return (
    APPOINTMENT_STATUSES.find((s) => s.value === statut) ?? {
      label: statut,
      color: 'bg-gray-100 text-gray-700',
    }
  )
}

function typeLabel(type: string) {
  return APPOINTMENT_TYPES.find((t) => t.value === type)?.label ?? type
}

export default function AppointmentsView({
  initialAppointments,
  sites,
  leads,
  profiles,
  isDemo,
}: Props) {
  const router = useRouter()
  const [appointments, setAppointments] = useState(initialAppointments)
  const [tab, setTab] = useState<Tab>('calendar')
  const [siteFilter, setSiteFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [defaultDate, setDefaultDate] = useState<string | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentItem | null>(null)
  const [detail, setDetail] = useState<AppointmentItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAppointments(initialAppointments)
  }, [initialAppointments])

  const filtered = useMemo(() => {
    return appointments
      .filter((a) => (siteFilter === 'all' ? true : a.site_id === siteFilter))
      .filter((a) => (statusFilter === 'all' ? true : a.statut === statusFilter))
      .filter((a) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        const nom = getProspectNom(a).toLowerCase()
        const tel = a.lead?.telephone ?? ''
        return nom.includes(q) || tel.includes(q)
      })
      .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime())
  }, [appointments, siteFilter, statusFilter, search])

  const stats = useMemo(() => {
    const now = Date.now()
    const upcoming = appointments.filter(
      (a) => new Date(a.debut).getTime() >= now && !['annule', 'effectue'].includes(a.statut)
    )
    return {
      total: appointments.length,
      upcoming: upcoming.length,
      confirmed: appointments.filter((a) => a.statut === 'confirme').length,
      toConfirm: upcoming.filter((a) => a.statut === 'planifie').length,
      done: appointments.filter((a) => a.statut === 'effectue').length,
      absent: appointments.filter((a) => a.statut === 'absent').length,
    }
  }, [appointments])

  const confirmationQueue = useMemo(() => {
    return appointments.filter(
      (a) =>
        a.statut === 'planifie' &&
        new Date(a.debut).getTime() >= Date.now() - 2 * 60 * 60 * 1000 &&
        new Date(a.debut).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000
    )
  }, [appointments])

  function refreshLocal(id: string, patch: Partial<AppointmentItem>) {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    setDetail((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev))
  }

  function addLocalAppointment(data: {
    lead_id: string
    site_id: string | null
    assigne_a_id: string | null
    type: string
    debutIso: string
    duree: number
    notes: string | null
  }) {
    const leadOption = leads.find((l) => l.id === data.lead_id)
    const siteOption = sites.find((s) => s.id === data.site_id)
    const profileOption = profiles.find((p) => p.id === data.assigne_a_id)
    const fin = new Date(
      new Date(data.debutIso).getTime() + data.duree * 60_000
    ).toISOString()

    const item: AppointmentItem = {
      id: `demo-rdv-${Date.now()}`,
      lead_id: data.lead_id,
      site_id: data.site_id,
      assigne_a_id: data.assigne_a_id,
      debut: data.debutIso,
      fin,
      type: data.type,
      statut: 'planifie',
      token_public: `demo-${Date.now()}`,
      notes_crc: data.notes,
      lead: leadOption
        ? {
            id: leadOption.id,
            nom: leadOption.nom,
            prenom: leadOption.prenom,
            telephone: leadOption.telephone,
          }
        : null,
      site: siteOption
        ? { id: siteOption.id, nom: siteOption.nom, ville: siteOption.ville }
        : null,
      assigne_a: profileOption
        ? { nom: profileOption.nom, prenom: profileOption.prenom }
        : null,
      __demo: true,
    }

    setAppointments((prev) => [...prev, item])
  }

  function rescheduleLocalAppointment(id: string, debutIso: string, duree: number) {
    const fin = new Date(new Date(debutIso).getTime() + duree * 60_000).toISOString()
    refreshLocal(id, { debut: debutIso, fin, statut: 'planifie' })
  }

  async function runStatus(
    id: string,
    statut: 'planifie' | 'confirme' | 'effectue' | 'absent' | 'annule' | 'replanifie'
  ) {
    setError(null)
    setBusy(true)
    const target = appointments.find((a) => a.id === id)

    if (target?.__demo) {
      refreshLocal(id, { statut })
      setBusy(false)
      return
    }

    const res = await updateAppointmentStatus({ id, statut })
    setBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Mise à jour impossible')
      return
    }
    refreshLocal(id, { statut })
    router.refresh()
  }

  async function handleConfirm(id: string) {
    setError(null)
    setBusy(true)
    const target = appointments.find((a) => a.id === id)

    if (target?.__demo) {
      refreshLocal(id, { statut: 'confirme', confirme_par_crc_le: new Date().toISOString() })
      setBusy(false)
      return
    }

    const res = await confirmAppointment(id)
    setBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Confirmation impossible')
      return
    }
    refreshLocal(id, { statut: 'confirme', confirme_par_crc_le: new Date().toISOString() })
    router.refresh()
  }

  async function handleGoogleSync(id: string) {
    setError(null)
    setBusy(true)
    const target = appointments.find((a) => a.id === id)
    if (target?.__demo) {
      setBusy(false)
      setError('Google Calendar n’est pas configuré sur cette démonstration.')
      return
    }
    const res = await syncAppointmentToGoogle(id)
    setBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Synchronisation impossible')
      return
    }
    refreshLocal(id, { google_event_id: res.eventId ?? 'google' })
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Supprimer définitivement ce rendez-vous ?')) return
    setError(null)
    setBusy(true)
    const target = appointments.find((a) => a.id === id)

    if (target?.__demo) {
      setAppointments((prev) => prev.filter((a) => a.id !== id))
      setDetail(null)
      setBusy(false)
      return
    }

    const res = await deleteAppointment(id)
    setBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Suppression impossible')
      return
    }
    setAppointments((prev) => prev.filter((a) => a.id !== id))
    setDetail(null)
    router.refresh()
  }

  function openCreate(date?: string) {
    setRescheduleTarget(null)
    setDefaultDate(date ?? null)
    setModalOpen(true)
  }

  function openReschedule(appointment: AppointmentItem) {
    setDetail(null)
    setRescheduleTarget(appointment)
    setModalOpen(true)
  }

  function exportRows() {
    return filtered.map((a) => [
      format(new Date(a.debut), 'dd/MM/yyyy HH:mm'),
      format(new Date(a.fin), 'HH:mm'),
      getProspectNom(a),
      a.lead?.telephone ?? '',
      a.site?.nom ?? '',
      a.site?.ville ?? '',
      a.assigne_a ? [a.assigne_a.prenom, a.assigne_a.nom].filter(Boolean).join(' ') : '',
      typeLabel(a.type),
      statusBadge(a.statut).label,
    ])
  }

  const exportHeaders = [
    'Date',
    'Fin',
    'Prospect',
    'Téléphone',
    'Site',
    'Ville',
    'Commercial',
    'Type',
    'Statut',
  ]

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rendez-vous Showroom</h2>
          <p className="text-sm text-gray-500">
            Planification des créneaux, confirmation CRC J-1 et suivi commercial
          </p>
        </div>
        <button
          onClick={() => openCreate()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <CalendarPlus className="w-4 h-4" />
          Planifier un RDV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'À venir', value: stats.upcoming, icon: CalendarDays, tint: 'text-brand-600 bg-brand-50' },
          { label: 'À confirmer (J-1)', value: stats.toConfirm, icon: Clock, tint: 'text-amber-600 bg-amber-50' },
          { label: 'Confirmés', value: stats.confirmed, icon: CheckCircle2, tint: 'text-emerald-600 bg-emerald-50' },
          { label: 'Effectués', value: stats.done, icon: TrendingUp, tint: 'text-violet-600 bg-violet-50' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.tint}`}>
              <kpi.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500">{kpi.label}</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start justify-between gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 w-full lg:w-auto overflow-x-auto">
          {[
            { key: 'calendar' as Tab, label: 'Calendrier', icon: CalendarDays },
            { key: 'confirmations' as Tab, label: 'Confirmations J-1', icon: CheckCircle2, count: confirmationQueue.length },
            { key: 'list' as Tab, label: 'Liste', icon: List },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                tab === t.key ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {typeof t.count === 'number' && t.count > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] inline-flex items-center justify-center">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="all">Tous les sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>

          {tab === 'list' && (
            <>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Prospect ou téléphone…"
                  className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs w-44 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="all">Tous les statuts</option>
                {APPOINTMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    downloadCsv(`rdv-${todaySlug()}`, exportHeaders, exportRows())
                  }
                  title="Exporter CSV"
                  className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    downloadExcel(
                      `rdv-${todaySlug()}`,
                      'Rendez-vous Otoclic',
                      exportHeaders,
                      exportRows()
                    )
                  }
                  title="Exporter Excel"
                  className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    printReport('Rendez-vous Otoclic', exportHeaders, exportRows())
                  }
                  title="Imprimer / PDF"
                  className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contenu */}
      {tab === 'calendar' && (
        <AppointmentsCalendar
          appointments={filtered}
          sites={sites}
          onSelectAppointment={setDetail}
          onNewAppointment={(date) => openCreate(date)}
        />
      )}

      {tab === 'confirmations' && (
        <ConfirmationQueue
          appointments={confirmationQueue}
          sites={sites}
          onReschedule={openReschedule}
        />
      )}

      {tab === 'list' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-800">Aucun rendez-vous</p>
              <p className="text-xs text-gray-400 mt-1">
                Ajustez vos filtres ou planifiez un nouveau rendez-vous.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50/80 text-gray-500">
                    <tr>
                      <th className="text-left font-semibold px-4 py-2.5">Date</th>
                      <th className="text-left font-semibold px-4 py-2.5">Prospect</th>
                      <th className="text-left font-semibold px-4 py-2.5">Site</th>
                      <th className="text-left font-semibold px-4 py-2.5">Commercial</th>
                      <th className="text-left font-semibold px-4 py-2.5">Type</th>
                      <th className="text-left font-semibold px-4 py-2.5">Statut</th>
                      <th className="text-right font-semibold px-4 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((a) => {
                      const badge = statusBadge(a.statut)
                      const color = getSiteColor(a.site_id, sites)
                      return (
                        <tr key={a.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-semibold text-gray-900">
                              {format(new Date(a.debut), 'dd MMM yyyy', { locale: fr })}
                            </p>
                            <p className="text-gray-400 tabular-nums">
                              {format(new Date(a.debut), 'HH:mm')} –{' '}
                              {format(new Date(a.fin), 'HH:mm')}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{getProspectNom(a)}</p>
                            <a
                              href={`tel:${a.lead?.telephone ?? ''}`}
                              className="text-brand-600 hover:text-brand-700"
                            >
                              {a.lead?.telephone}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${color.bg}`} />
                              <span className="text-gray-700">{a.site?.nom ?? '—'}</span>
                            </span>
                            <p className="text-gray-400">{a.site?.ville ?? ''}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {a.assigne_a
                              ? [a.assigne_a.prenom, a.assigne_a.nom]
                                  .filter(Boolean)
                                  .join(' ')
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{typeLabel(a.type)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {a.statut === 'planifie' && (
                                <button
                                  onClick={() => handleConfirm(a.id)}
                                  disabled={busy}
                                  title="Confirmer"
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {['planifie', 'confirme'].includes(a.statut) && (
                                <button
                                  onClick={() => runStatus(a.id, 'effectue')}
                                  disabled={busy}
                                  title="Marquer effectué"
                                  className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!['annule', 'effectue'].includes(a.statut) && (
                                <button
                                  onClick={() => runStatus(a.id, 'absent')}
                                  disabled={busy}
                                  title="Marquer absent"
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => openReschedule(a)}
                                disabled={busy}
                                title="Replanifier"
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDetail(a)}
                                title="Détails"
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="lg:hidden divide-y divide-gray-50">
                {filtered.map((a) => {
                  const badge = statusBadge(a.statut)
                  const color = getSiteColor(a.site_id, sites)
                  return (
                    <button
                      key={a.id}
                      onClick={() => setDetail(a)}
                      className="w-full text-left p-4 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {getProspectNom(a)}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {format(new Date(a.debut), 'EEEE dd MMM · HH:mm', { locale: fr })}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                          <span className={`w-1.5 h-1.5 rounded-full ${color.bg}`} />
                          {a.site?.nom ?? 'Site non défini'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {a.lead?.telephone}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modale création / reprogrammation */}
      <AppointmentFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setRescheduleTarget(null)
        }}
        leads={leads}
        sites={sites}
        profiles={profiles}
        defaultDate={defaultDate}
        appointment={rescheduleTarget}
        isDemo={isDemo}
        onSuccess={() => router.refresh()}
        onLocalCreate={addLocalAppointment}
        onLocalReschedule={rescheduleLocalAppointment}
      />

      {/* Détail */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{getProspectNom(detail)}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {format(new Date(detail.debut), 'EEEE d MMMM yyyy · HH:mm', { locale: fr })}
                  {' – '}
                  {format(new Date(detail.fin), 'HH:mm')}
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 py-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Statut</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    statusBadge(detail.statut).color
                  }`}
                >
                  {statusBadge(detail.statut).label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Téléphone</span>
                <a href={`tel:${detail.lead?.telephone ?? ''}`} className="font-medium text-brand-600">
                  {detail.lead?.telephone ?? '—'}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-800">{detail.lead?.email ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Site</span>
                <span className="font-medium text-gray-800">
                  {detail.site?.nom ?? '—'}
                  {detail.site?.ville ? ` — ${detail.site.ville}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Commercial</span>
                <span className="font-medium text-gray-800">
                  {detail.assigne_a
                    ? [detail.assigne_a.prenom, detail.assigne_a.nom].filter(Boolean).join(' ')
                    : 'Non assigné'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium text-gray-800">{typeLabel(detail.type)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Google Agenda</span>
                <span className="font-medium text-gray-800">
                  {detail.google_event_id ? 'Synchronisé' : 'Non synchronisé'}
                </span>
              </div>
              {detail.notes_crc && (
                <div className="pt-2">
                  <p className="text-gray-500 mb-1">Notes CRC</p>
                  <p className="bg-gray-50 rounded-lg p-2.5 text-gray-700 leading-relaxed">
                    {detail.notes_crc}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {detail.statut === 'planifie' && (
                <button
                  onClick={() => handleConfirm(detail.id)}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirmer
                </button>
              )}
              {['planifie', 'confirme'].includes(detail.statut) && (
                <button
                  onClick={() => runStatus(detail.id, 'effectue')}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Effectué
                </button>
              )}
              {!['annule', 'effectue'].includes(detail.statut) && (
                <button
                  onClick={() => runStatus(detail.id, 'absent')}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Absent
                </button>
              )}
              <button
                onClick={() => openReschedule(detail)}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Replanifier
              </button>
              <button
                onClick={() => handleGoogleSync(detail.id)}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-lg"
              >
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Google
              </button>
              {detail.token_public && (
                <a
                  href={`/rdv/${detail.token_public}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-lg"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Lien prospect
                </a>
              )}
              <button
                onClick={() => handleDelete(detail.id)}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}