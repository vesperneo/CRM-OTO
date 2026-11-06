import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Filter, Search, Download, Phone, Calendar } from 'lucide-react'
import { formatTelephone, formatTimeAgo, formatMontant } from '@/lib/utils'
import { LEAD_STATUSES } from '@/lib/constants'

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*, source:sources(nom), site_prefere:sites(nom)')
    .order('created_at', { ascending: false })
    .limit(50)

  const items = leads && leads.length > 0 ? leads : [
    {
      id: 'demo-1',
      nom: 'Bennani',
      prenom: 'Youssef',
      telephone: '+212661234567',
      statut: 'nouveau',
      source: { nom: 'Meta Lead Ads' },
      site_prefere: { nom: 'Showroom Casa Centre' },
      interet_produit: 'SUV Hybride',
      budget: 280000,
      score: 65,
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'demo-2',
      nom: 'El Amrani',
      prenom: 'Fatima',
      telephone: '+212662987654',
      statut: 'en_qualification_crc',
      source: { nom: 'Site web' },
      site_prefere: { nom: 'Showroom Rabat Agdal' },
      interet_produit: 'Berline Compacte',
      budget: 350000,
      score: 80,
      created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: 'demo-3',
      nom: 'Tazi',
      prenom: 'Mehdi',
      telephone: '+212663112233',
      statut: 'rdv_planifie',
      source: { nom: 'Google Ads' },
      site_prefere: { nom: 'Showroom Casa Centre' },
      interet_produit: 'Électrique',
      budget: 420000,
      score: 90,
      created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
    {
      id: 'demo-4',
      nom: 'Chraibi',
      prenom: 'Salma',
      telephone: '+212664445566',
      statut: 'qualifie',
      source: { nom: 'WhatsApp entrant' },
      site_prefere: { nom: 'Showroom Marrakech' },
      interet_produit: 'Crossover',
      budget: 220000,
      score: 75,
      created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Leads</h2>
          <p className="text-sm text-gray-500">Centralisation et traitement des prospects</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 shadow-sm">
            <Download className="w-4 h-4 text-gray-500" />
            Exporter CSV
          </button>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm">
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
            placeholder="Rechercher par nom, téléphone, ville ou source..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <Filter className="w-4 h-4 text-gray-500" />
            Tous les statuts
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Tous les sites
          </button>
        </div>
      </div>

      {/* Tableau des leads */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Prospect</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Source & Intérêt</th>
                <th className="py-3.5 px-4">Site préféré</th>
                <th className="py-3.5 px-4">Budget</th>
                <th className="py-3.5 px-4">Score</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((lead: any) => {
                const statusObj = LEAD_STATUSES.find(s => s.value === lead.statut)
                return (
                  <tr key={lead.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900">{lead.prenom} {lead.nom}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(lead.created_at)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-900 font-mono text-xs">{formatTelephone(lead.telephone)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-800 text-xs font-medium">{lead.interet_produit ?? '—'}</div>
                      <div className="text-[11px] text-gray-400">{lead.source?.nom ?? 'Direct'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      {lead.site_prefere?.nom ?? 'Non assigné'}
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
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={`tel:${lead.telephone}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Appeler"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <Link
                          href={`/rendez-vous`}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Prendre RDV"
                        >
                          <Calendar className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
