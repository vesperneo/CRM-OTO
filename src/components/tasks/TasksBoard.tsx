'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  AlertCircle,
  CalendarClock,
  RefreshCw,
  Loader2,
  X,
} from 'lucide-react'
import { formatDateTime, formatTelephone, makeTelLink } from '@/lib/utils'
import { TASK_TYPES } from '@/lib/constants'
import { completeTask, rescheduleTask } from '@/features/tasks/actions'

export interface TaskItem {
  id: string
  type: string
  statut: string
  echeance: string
  notes?: string | null
  lead?: { nom: string; prenom?: string | null; telephone: string } | null
  assigne?: { nom: string; prenom?: string | null } | null
  __demo?: boolean
}

interface Props {
  initialTasks: TaskItem[]
}

type Filter = 'today' | 'late' | 'all' | 'done'

function isLate(task: TaskItem): boolean {
  return task.statut !== 'terminee' && new Date(task.echeance).getTime() < Date.now()
}

function isToday(task: TaskItem): boolean {
  const d = new Date(task.echeance)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function taskMeta(type: string) {
  return TASK_TYPES.find((t) => t.value === type) ?? { label: type, icon: '📌', color: 'text-gray-600' }
}

export default function TasksBoard({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks)
  const [filter, setFilter] = useState<Filter>('today')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [newEcheance, setNewEcheance] = useState('')

  const counts = useMemo(() => {
    const active = tasks.filter((t) => t.statut !== 'terminee')
    return {
      late: active.filter(isLate).length,
      today: active.filter(isToday).length,
      active: active.length,
      done: tasks.filter((t) => t.statut === 'terminee').length,
    }
  }, [tasks])

  const visible = useMemo(() => {
    const sorted = [...tasks].sort(
      (a, b) => new Date(a.echeance).getTime() - new Date(b.echeance).getTime()
    )
    switch (filter) {
      case 'late':
        return sorted.filter((t) => t.statut !== 'terminee' && isLate(t))
      case 'all':
        return sorted.filter((t) => t.statut !== 'terminee')
      case 'done':
        return sorted.filter((t) => t.statut === 'terminee')
      case 'today':
      default:
        return sorted.filter(
          (t) => t.statut !== 'terminee' && (isToday(t) || isLate(t))
        )
    }
  }, [tasks, filter])

  async function handleComplete(task: TaskItem) {
    setError(null)
    setBusyId(task.id)

    if (task.__demo) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, statut: 'terminee' } : t))
      )
      setBusyId(null)
      return
    }

    const res = await completeTask(task.id)
    setBusyId(null)
    if (!res.success) {
      setError(res.error ?? 'Impossible de terminer cette tâche.')
      return
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, statut: 'terminee' } : t))
    )
  }

  async function handleReschedule(task: TaskItem) {
    if (!newEcheance) return
    setError(null)
    setBusyId(task.id)

    const iso = new Date(newEcheance).toISOString()

    if (task.__demo) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, echeance: iso } : t)))
      setBusyId(null)
      setRescheduleId(null)
      setNewEcheance('')
      return
    }

    const res = await rescheduleTask(task.id, iso)
    setBusyId(null)
    if (!res.success) {
      setError(res.error ?? 'Impossible de reporter cette tâche.')
      return
    }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, echeance: iso } : t)))
    setRescheduleId(null)
    setNewEcheance('')
  }

  const filters: { value: Filter; label: string; count?: number }[] = [
    { value: 'today', label: "Aujourd'hui", count: counts.today + counts.late },
    { value: 'late', label: 'En retard', count: counts.late },
    { value: 'all', label: 'Toutes', count: counts.active },
    { value: 'done', label: 'Terminées', count: counts.done },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mes tâches de relance</h2>
          <p className="text-sm text-gray-500">
            Rappels téléphoniques, confirmations de RDV et messages programmés
          </p>
        </div>
        {counts.late > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <AlertCircle className="w-3.5 h-3.5" />
            {counts.late} tâche{counts.late > 1 ? 's' : ''} en retard
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filter === f.value
                ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
            {typeof f.count === 'number' && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === f.value ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {visible.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Aucune tâche dans cette vue</p>
              <p className="text-xs text-gray-400 mt-1">
                {filter === 'done'
                  ? 'Les tâches terminées apparaîtront ici.'
                  : 'Votre file de relance est à jour.'}
              </p>
            </div>
          ) : (
            visible.map((task) => {
              const meta = taskMeta(task.type)
              const late = isLate(task)
              const done = task.statut === 'terminee'
              const prospect = task.lead
                ? `${task.lead.prenom ?? ''} ${task.lead.nom}`.trim()
                : 'Prospect non lié'

              return (
                <div
                  key={task.id}
                  className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    done ? 'opacity-60' : 'hover:bg-gray-50/70'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm">{meta.icon}</span>
                      <span className={`font-semibold text-sm text-gray-900 ${done ? 'line-through' : ''}`}>
                        {meta.label}
                      </span>
                      {late && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">
                          En retard
                        </span>
                      )}
                      {done && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Terminée
                        </span>
                      )}
                    </div>
                    {task.notes && <p className="text-xs text-gray-600 truncate">{task.notes}</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                      {task.lead ? (
                        <Link href={`/leads`} className="hover:text-brand-600">
                          {prospect}
                          {task.lead.telephone ? ` (${formatTelephone(task.lead.telephone)})` : ''}
                        </Link>
                      ) : (
                        <span>{prospect}</span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(task.echeance)}
                      </span>
                      {task.assigne?.nom && (
                        <span>
                          Assignée à {task.assigne.prenom} {task.assigne.nom}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {task.lead?.telephone && !done && (
                      <a
                        href={makeTelLink(task.lead.telephone)}
                        className="px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 inline-flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Appeler
                      </a>
                    )}
                    {task.type === 'whatsapp' && !done && task.lead?.telephone && (
                      <a
                        href={`https://wa.me/${task.lead.telephone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 inline-flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    )}
                    {!done && (
                      <>
                        <button
                          onClick={() => {
                            setRescheduleId(rescheduleId === task.id ? null : task.id)
                            setNewEcheance('')
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 inline-flex items-center gap-1"
                        >
                          {rescheduleId === task.id ? <X className="w-3.5 h-3.5" /> : <CalendarClock className="w-3.5 h-3.5" />}
                          Reporter
                        </button>
                        <button
                          onClick={() => handleComplete(task)}
                          disabled={busyId === task.id}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 rounded-lg border border-emerald-200 inline-flex items-center gap-1"
                        >
                          {busyId === task.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Terminer
                        </button>
                      </>
                    )}
                  </div>

                  {rescheduleId === task.id && (
                    <div className="w-full lg:order-last lg:basis-full flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                      <input
                        type="datetime-local"
                        value={newEcheance}
                        onChange={(e) => setNewEcheance(e.target.value)}
                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleReschedule(task)}
                        disabled={!newEcheance || busyId === task.id}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 rounded-lg inline-flex items-center gap-1"
                      >
                        {busyId === task.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Confirmer le report
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
