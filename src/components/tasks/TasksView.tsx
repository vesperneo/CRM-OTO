'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, CheckCircle2, Clock, Calendar, MessageCircle, AlertCircle, ChevronRight, Trash2 } from 'lucide-react'
import { formatDateTime, formatTimeAgo, formatTelephone, makeWhatsAppLink } from '@/lib/utils'
import { completeTask, rescheduleTask, deleteTask } from '@/features/tasks/actions'

interface TaskItem {
  id: string
  lead_id: string
  type: string
  statut: string
  echeance: string
  notes?: string | null
  lead?: {
    id: string
    nom: string
    prenom?: string | null
    telephone: string
    statut: string
  } | null
}

interface Props {
  initialTasks: TaskItem[]
}

export default function TasksView({ initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [filter, setFilter] = useState<'all' | 'late' | 'today' | 'upcoming'>('all')

  const now = new Date()

  const processedTasks = tasks.map(t => {
    const d = new Date(t.echeance)
    const isLate = d < now && t.statut === 'en_attente'
    const isToday = d.toDateString() === now.toDateString()
    return { ...t, isLate, isToday }
  })

  const filtered = processedTasks.filter(t => {
    if (filter === 'late') return t.isLate
    if (filter === 'today') return t.isToday && !t.isLate
    if (filter === 'upcoming') return !t.isToday && !t.isLate
    return true
  })

  async function handleComplete(taskId: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, statut: 'terminee' } : t))
    await completeTask(taskId)
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return
    setTasks(prev => prev.filter(t => t.id !== taskId))
    await deleteTask(taskId)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mes tâches & Relances</h2>
          <p className="text-sm text-gray-500">Rappels téléphoniques prioritaires, confirmations de RDV et messages WhatsApp</p>
        </div>
      </div>

      {/* Onglets de filtrage */}
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        {[
          { key: 'all', label: `Toutes (${tasks.length})` },
          { key: 'late', label: `En retard (${processedTasks.filter(t => t.isLate).length})` },
          { key: 'today', label: `Aujourd'hui (${processedTasks.filter(t => t.isToday && !t.isLate).length})` },
          { key: 'upcoming', label: `À venir (${processedTasks.filter(t => !t.isToday && !t.isLate).length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === key
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Liste des tâches */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            Aucune tâche à afficher dans cette vue.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(t => (
              <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">
                      {t.type === 'rappel_appel' && '📞 Rappel téléphonique demandé'}
                      {t.type === 'confirmation_rdv' && '📅 Confirmation RDV Showroom J-1'}
                      {t.type === 'whatsapp' && '💬 Relance WhatsApp'}
                      {t.type === 'reactivation' && '🔄 Réactivation prospect silencieux'}
                    </span>
                    {t.isLate && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                        En retard
                      </span>
                    )}
                    {t.statut === 'terminee' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Terminée
                      </span>
                    )}
                  </div>

                  {t.lead && (
                    <div className="text-xs text-gray-700 flex items-center gap-2">
                      <Link href={`/leads/${t.lead.id}`} className="font-bold text-brand-600 hover:underline">
                        {t.lead.prenom} {t.lead.nom}
                      </Link>
                      <span className="text-gray-400">•</span>
                      <span className="font-mono text-gray-500">{formatTelephone(t.lead.telephone)}</span>
                    </div>
                  )}

                  {t.notes && <p className="text-xs text-gray-500 italic">"{t.notes}"</p>}

                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Échéance : {formatDateTime(t.echeance)} ({formatTimeAgo(t.echeance)})
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {t.lead?.telephone && (
                    <>
                      <a
                        href={`tel:${t.lead.telephone}`}
                        className="px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 flex items-center gap-1"
                        title="Appeler"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Appeler
                      </a>
                      <a
                        href={makeWhatsAppLink(t.lead.telephone, 'Bonjour, je fais suite à notre échange concernant votre projet automobile.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 flex items-center gap-1"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </>
                  )}

                  {t.statut !== 'terminee' && (
                    <button
                      onClick={() => handleComplete(t.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Terminer
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                    title="Supprimer la tâche"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

