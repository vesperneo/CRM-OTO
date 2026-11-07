'use client'

import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '@/lib/constants'
import type { AppointmentItem, SiteOption } from './types'
import { getProspectNom, getSiteColor } from './types'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface Props {
  appointments: AppointmentItem[]
  sites: SiteOption[]
  onSelectAppointment: (appointment: AppointmentItem) => void
  onNewAppointment: (dateIso: string) => void
}

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

export default function AppointmentsCalendar({
  appointments,
  sites,
  onSelectAppointment,
  onNewAppointment,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>()
    for (const appt of appointments) {
      const key = format(new Date(appt.debut), 'yyyy-MM-dd')
      const list = map.get(key) ?? []
      list.push(appt)
      map.set(key, list)
    }
    map.forEach((list) =>
      list.sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime())
    )
    return map
  }, [appointments])

  const selectedKey = format(selectedDay, 'yyyy-MM-dd')
  const dayAppointments = byDay.get(selectedKey) ?? []
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: fr })

  const activeSites = sites.filter((site) =>
    appointments.some((a) => a.site_id === site.id)
  )

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-gray-900 capitalize min-w-[140px] text-center">
              {monthLabel}
            </h3>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setCurrentMonth(startOfMonth(new Date()))
                setSelectedDay(new Date())
              }}
              className="ml-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Aujourd’hui
            </button>
          </div>

          <button
            onClick={() => onNewAppointment(format(selectedDay, 'yyyy-MM-dd'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Nouveau RDV
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/70">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wide"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const items = byDay.get(key) ?? []
            const inMonth = isSameMonth(day, currentMonth)
            const selected = isSameDay(day, selectedDay)

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(day)}
                className={`relative text-left border-b border-r border-gray-100 min-h-[72px] sm:min-h-[112px] p-1.5 sm:p-2 transition-colors ${
                  selected
                    ? 'bg-brand-50/70 ring-2 ring-inset ring-brand-400'
                    : 'hover:bg-gray-50/80'
                } ${inMonth ? 'bg-white' : 'bg-gray-50/40'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold ${
                      isToday(day)
                        ? 'bg-brand-600 text-white'
                        : inMonth
                        ? 'text-gray-700'
                        : 'text-gray-300'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {items.length > 0 && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-brand-600 bg-brand-100/70 rounded-full px-1.5 py-0.5">
                      {items.length}
                    </span>
                  )}
                </div>

                {/* Mobile : pastilles colorées */}
                <div className="sm:hidden flex flex-wrap gap-0.5 mt-0.5">
                  {items.slice(0, 4).map((appt) => {
                    const color = getSiteColor(appt.site_id, sites)
                    return (
                      <span
                        key={appt.id}
                        className={`w-1.5 h-1.5 rounded-full ${color.bg}`}
                      />
                    )
                  })}
                  {items.length > 4 && (
                    <span className="text-[8px] text-gray-400">+{items.length - 4}</span>
                  )}
                </div>

                {/* Desktop : pastilles détaillées */}
                <div className="hidden sm:block space-y-0.5">
                  {items.slice(0, 3).map((appt) => {
                    const color = getSiteColor(appt.site_id, sites)
                    return (
                      <span
                        key={appt.id}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${color.soft} ${color.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.bg}`} />
                        <span className="shrink-0 tabular-nums">
                          {format(new Date(appt.debut), 'HH:mm')}
                        </span>
                        <span className="truncate">
                          {appt.lead?.prenom ?? appt.lead?.nom ?? 'RDV'}
                        </span>
                      </span>
                    )
                  })}
                  {items.length > 3 && (
                    <span className="block text-[10px] text-gray-400 pl-1">
                      +{items.length - 3} autres
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Légende des sites */}
      {activeSites.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
          {activeSites.map((site) => {
            const color = getSiteColor(site.id, sites)
            return (
              <span
                key={site.id}
                className="inline-flex items-center gap-1.5 text-[11px] text-gray-500"
              >
                <span className={`w-2 h-2 rounded-full ${color.bg}`} />
                {site.nom}
                {site.ville ? ` — ${site.ville}` : ''}
              </span>
            )
          })}
        </div>
      )}

      {/* Détail du jour sélectionné */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-900 capitalize">
            {format(selectedDay, 'EEEE d MMMM yyyy', { locale: fr })}
          </h4>
          <span className="text-[11px] font-medium text-gray-400">
            {dayAppointments.length} rendez-vous
          </span>
        </div>

        {dayAppointments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-gray-400">
              Aucun rendez-vous ce jour-là.
            </p>
            <button
              onClick={() => onNewAppointment(format(selectedDay, 'yyyy-MM-dd'))}
              className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Planifier un rendez-vous
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {dayAppointments.map((appt) => {
              const color = getSiteColor(appt.site_id, sites)
              const badge = statusBadge(appt.statut)
              return (
                <button
                  key={appt.id}
                  onClick={() => onSelectAppointment(appt)}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50/70 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="w-14 shrink-0">
                    <p className="text-xs font-bold text-gray-900 tabular-nums">
                      {format(new Date(appt.debut), 'HH:mm')}
                    </p>
                    <p className="text-[10px] text-gray-400 tabular-nums">
                      {format(new Date(appt.fin), 'HH:mm')}
                    </p>
                  </div>

                  <div className={`w-1 self-stretch rounded-full ${color.bg}`} />

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {getProspectNom(appt)}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {appt.site?.nom ?? 'Site non défini'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {typeLabel(appt.type)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}