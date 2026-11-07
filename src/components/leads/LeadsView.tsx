'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Filter, Search, Download, Phone, Calendar, Columns3, Upload, ChevronRight } from 'lucide-react'
import { formatTelephone, formatTimeAgo, formatMontant } from '@/lib/utils'
import { LEAD_STATUSES } from '@/lib/constants'
import LeadFormModal from './LeadFormModal'
import LeadDeleteButton from './LeadDeleteButton'

interface Props {
  initialLeads: any[]
  sources?: any[]
  sites?: any[]
}

export default function LeadsView({ initialLeads, sources = [], sites = [] }: Props) {
  const [leads, setLeads] = useState(initialLeads)
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedSite, setSelectedSite] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filtrage
  const filtered = leads.filter(lead => {
    const term = search.toLowerCase()
    const matchesSearch =
      !term ||
      lead.nom?.toLowerCase().includes(term) ||
      lead.prenom?.toLowerCase().includes(term) ||
      lead.telephone?.includes(term) ||
      lead.ville?.toLowerCase().includes(term) ||
      lead.interet_produit?.toLowerCase().includes(term)

    const matchesStatus = selectedStatus === 'all' || lead.statut === selectedStatus
    const matchesSite = selectedSite === 'all' || lead.site_prefere_id === selectedSite
    const matchesSource =
      selectedSource === 'all' || (lead.source?.nom ?? lead.source_nom ?? 'Direct') === selectedSource

    return matchesSearch && matchesStatus && matchesSite && matchesSource
  })

  // Export CSV
  function handleExportCSV() {
    const headers = ['Nom', 'Prénom', 'Téléphone', 'Email', 'Ville', 'Source', 'Statut', 'Budget', 'Score', 'Créé le']
    const rows = filtered.map(l => [
      l.nom,
      l.prenom ?? '',
      l.telephone,
      l.email ?? '',
      l.ville ?? '',
      l.source?.nom ?? l.source_nom ?? 'Direct',
      l.statut,
      l.budget ?? '',
      l.score ?? '',
      l.created_at,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `leads_otoclic_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header avec boutons d'actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Leads</h2>
          <p className="text-sm text-gray-500">Centralisation, qualification et passage aux showrooms</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/leads/kanban"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
          >
            <Columns3 className="w-3.5 h-3.5" />
            Vue Kanban
          </Link>
          <Link
            href="/leads/import"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </Link>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Export CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau lead
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, ville ou modèle..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="all">Tous les statuts ({leads.length})</option>
            {LEAD_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={selectedSite}
            onChange={e => setSelectedSite(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="all">Tous les sites</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>

          <select
            value={selectedSource}
            onChange={e => setSelectedSource(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="all">Toutes les sources</option>
            {sources.map(s => (
              <option key={s.id} value={s.nom}>{s.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau des leads */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Prospect</th>
                <th className="py-3.5 px-4">Téléphone</th>
                <th className="py-3.5 px-4">Source & Intérêt</th>
                <th className="py-3.5 px-4">Site préféré</th>
                <th className="py-3.5 px-4">Budget</th>
                <th className="py-3.5 px-4">Score</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-gray-400">
                    Aucun prospect ne correspond aux critères sélectionnés.
                  </td>
                </tr>
              ) : (
                filtered.map((lead: any) => {
                  const statusObj = LEAD_STATUSES.find(s => s.value === lead.statut)
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link href={`/leads/${lead.id}`} className="font-semibold text-gray-900 hover:text-brand-600 block">
                          {lead.prenom} {lead.nom}
                        </Link>
                        <div className="text-[11px] text-gray-400 mt-0.5">{formatTimeAgo(lead.created_at)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-gray-900 font-mono text-xs">{formatTelephone(lead.telephone)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-gray-800 text-xs font-medium">{lead.interet_produit ?? '—'}</div>
                        <div className="text-[11px] text-gray-400">{lead.source?.nom ?? lead.source_nom ?? 'Direct'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        {lead.site_prefere?.nom ?? lead.site_nom ?? 'Non assigné'}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-gray-900">
                        {formatMontant(lead.budget)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                          {lead.score ?? 0} pts
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusObj?.bgColor} ${statusObj?.textColor}`}>
                          {statusObj?.label ?? lead.statut}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={`tel:${lead.telephone}`}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                            title="Appeler"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <Link
                            href={`/leads/${lead.id}`}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            title="Consulter"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                          <LeadDeleteButton
                            leadId={lead.id}
                            leadName={`${lead.prenom ?? ''} ${lead.nom}`.trim()}
                            variant="icon"
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LeadFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sources={sources}
        sites={sites}
      />
    </div>
  )
}

