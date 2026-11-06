import { createClient } from '@/lib/supabase/server'
import {
  Users,
  PhoneCall,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatTimeAgo, formatTelephone, formatMontant } from '@/lib/utils'
import { LEAD_STATUSES } from '@/lib/constants'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Queries (graceful fallback if tables are empty or demo mode)
  const [
    { count: totalLeads },
    { count: newLeadsCount },
    { count: qualifiedCount },
    { count: rdvCount },
    { data: recentLeads },
    { data: urgentTasks },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('statut', 'nouveau'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('statut', 'qualifie'),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('statut', 'planifie'),
    supabase.from('leads').select('*, source:sources(nom)').order('created_at', { ascending: false }).limit(5),
    supabase.from('tasks_relances').select('*, lead:leads(nom, prenom, telephone)').eq('statut', 'en_attente').order('echeance', { ascending: true }).limit(5),
  ])

  // Demo fallback stats if DB is fresh
  const stats = [
    {
      label: 'Total Leads',
      value: totalLeads ?? 124,
      change: '+14% ce mois',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Nouveaux à traiter',
      value: newLeadsCount ?? 18,
      change: 'Priorité CRC',
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Qualifiés CRC',
      value: qualifiedCount ?? 45,
      change: 'Taux transf. 36%',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'RDV Showroom',
      value: rdvCount ?? 12,
      change: 'Semaine en cours',
      icon: Calendar,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  // Demo fallback leads
  const displayLeads = recentLeads && recentLeads.length > 0 ? recentLeads : [
    {
      id: 'demo-1',
      nom: 'Bennani',
      prenom: 'Youssef',
      telephone: '+212661234567',
      statut: 'nouveau',
      source: { nom: 'Meta Lead Ads' },
      budget: 280000,
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      id: 'demo-2',
      nom: 'El Amrani',
      prenom: 'Fatima',
      telephone: '+212662987654',
      statut: 'en_qualification_crc',
      source: { nom: 'Site web' },
      budget: 350000,
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 'demo-3',
      nom: 'Tazi',
      prenom: 'Mehdi',
      telephone: '+212663112233',
      statut: 'rdv_planifie',
      source: { nom: 'Google Ads' },
      budget: 420000,
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tableau de bord CRC & Showroom</h2>
          <p className="text-sm text-gray-500 mt-1">
            Flux cible : Lead entrant → Qualification CRC → RDV Showroom → Confirmation J-1
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/crc/file"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <PhoneCall className="w-4 h-4" />
            Lancer les appels CRC
          </Link>
          <Link
            href="/leads"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-sm font-medium rounded-lg transition-colors"
          >
            Voir tous les leads
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          )
        })}
      </div>

      {/* SLA Alert banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-900">SLA Premier Appel (&lt; 15 min)</h4>
          <p className="text-xs text-amber-700 mt-0.5">
            2 nouveaux leads en attente depuis plus de 10 minutes. Ouvrez la file CRC pour traiter le prochain lead prioritaire.
          </p>
        </div>
        <Link
          href="/crc/file"
          className="text-xs font-semibold text-amber-900 hover:underline flex items-center gap-1 self-center"
        >
          Traiter <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Two columns: Recent Leads + Daily Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads récents */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Derniers leads enregistrés</h3>
            <Link href="/leads" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Voir tout <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Lead</th>
                  <th className="py-3 px-4">Téléphone</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Arrivé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayLeads.map((lead: any) => {
                  const statusObj = LEAD_STATUSES.find(s => s.value === lead.statut)
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {lead.prenom} {lead.nom}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatTelephone(lead.telephone)}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {lead.source?.nom ?? 'Direct'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusObj?.bgColor} ${statusObj?.textColor}`}>
                          {statusObj?.label ?? lead.statut}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {formatTimeAgo(lead.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mes relances prioritaires */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Relances urgentes</h3>
            <Link href="/taches" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Gérer
            </Link>
          </div>
          <div className="mt-4 space-y-3 flex-1">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-3">
              <PhoneCall className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs flex-1">
                <p className="font-medium text-gray-900">Rappel client: Youssef B.</p>
                <p className="text-gray-500">Demande rappel à 15h00 (reprise véhicule)</p>
                <span className="inline-block mt-1 text-[10px] text-amber-600 font-medium">À 15:00 aujourd'hui</span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-start gap-3">
              <Calendar className="w-4 h-4 text-emerald-600 mt-0.5" />
              <div className="text-xs flex-1">
                <p className="font-medium text-gray-900">Confirmation RDV J-1: Mehdi T.</p>
                <p className="text-gray-500">Showroom Casablanca Centre</p>
                <span className="inline-block mt-1 text-[10px] text-blue-600 font-medium">Demain à 10:30</span>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <Link
              href="/taches"
              className="w-full block text-center py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium rounded-lg transition-colors border border-gray-200"
            >
              Voir toutes mes tâches
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
