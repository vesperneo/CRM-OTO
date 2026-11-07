'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, Calendar, ArrowRight, ArrowLeft, Plus, Table } from 'lucide-react'
import { formatTelephone, formatMontant } from '@/lib/utils'
import { KANBAN_STATUSES, LEAD_STATUSES } from '@/lib/constants'
import { updateLeadStatus } from '@/features/leads/actions'

interface Props {
  initialLeads: any[]
}

export default function LeadKanban({ initialLeads }: Props) {
  const [leads, setLeads] = useState(initialLeads)

  async function handleMoveStatus(leadId: string, currentStatus: string, direction: 'prev' | 'next') {
    const currentIndex = KANBAN_STATUSES.indexOf(currentStatus as any)
    if (currentIndex === -1) return

    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (nextIndex < 0 || nextIndex >= KANBAN_STATUSES.length) return

    const newStatus = KANBAN_STATUSES[nextIndex]

    // Optimistic UI update
    setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, statut: newStatus } : l)))
    await updateLeadStatus(leadId, newStatus)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pipeline commercial (Kanban)</h2>
          <p className="text-sm text-gray-500">Progression visuelle de la qualification CRC jusqu'au showroom</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
          >
            <Table className="w-3.5 h-3.5" />
            Vue Liste
          </Link>
        </div>
      </div>

      {/* Colonnes Kanban avec scroll horizontal */}
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
        {KANBAN_STATUSES.map((statusKey, colIdx) => {
          const statusConfig = LEAD_STATUSES.find(s => s.value === statusKey)
          const columnLeads = leads.filter(l => l.statut === statusKey)

          return (
            <div
              key={statusKey}
              className="w-72 shrink-0 bg-gray-100/70 rounded-2xl p-3 flex flex-col max-h-[calc(100vh-220px)] border border-gray-200/60"
            >
              {/* Header de colonne */}
              <div className="flex items-center justify-between pb-3 px-1 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{statusConfig?.icon}</span>
                  <span className="text-xs font-bold text-gray-800">{statusConfig?.label}</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-gray-600 shadow-xs">
                  {columnLeads.length}
                </span>
              </div>

              {/* Cartes dans la colonne */}
              <div className="mt-3 space-y-3 overflow-y-auto flex-1 pr-1 scrollbar-thin">
                {columnLeads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-bold text-xs text-gray-900 hover:text-brand-600 truncate block"
                        >
                          {lead.prenom} {lead.nom}
                        </Link>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                          {lead.score ?? 0} pts
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-gray-500 mt-0.5">{formatTelephone(lead.telephone)}</p>
                    </div>

                    <div className="text-[11px] text-gray-600 space-y-0.5 pt-1 border-t border-gray-50">
                      <div className="font-medium text-gray-900 truncate">{lead.interet_produit ?? '—'}</div>
                      <div className="text-gray-500">{formatMontant(lead.budget)}</div>
                    </div>

                    {/* Actions de déplacement de colonne */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      {colIdx > 0 ? (
                        <button
                          onClick={() => handleMoveStatus(lead.id, lead.statut, 'prev')}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Statut précédent"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                      ) : <div />}

                      <a
                        href={`tel:${lead.telephone}`}
                        className="p-1 text-brand-600 hover:bg-brand-50 rounded"
                        title="Appeler"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>

                      {colIdx < KANBAN_STATUSES.length - 1 ? (
                        <button
                          onClick={() => handleMoveStatus(lead.id, lead.statut, 'next')}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="Statut suivant"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : <div />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

