import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/profile'
import {
  Users,
  PhoneCall,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import {
  formatTimeAgo,
  formatTelephone,
  isSupabaseConfigured,
} from '@/lib/utils'
import { LEAD_STATUSES } from '@/lib/constants'
import { computeLeadSla, formatMinutes } from '@/lib/sla'

export default async function DashboardPage() {
  const { profile } = await getCurrentProfile()

  let totalLeads: number | null = null
  let newLeadsCount: number | null = null
  let qualifiedCount: number | null = null
  let rdvCount: number | null = null
  let recentLeads: any[] | null = null
  let urgentTasks: any[] | null = null
  let slaLeads: any[] | null = null

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    const [
      { count: totalLeadsData },
      { count: newLeadsData },
      { count: qualifiedData },
      { count: rdvData },
      { data: recentLeadsData },
      { data: urgentTasksData },
      { data: slaLeadsData },
    ] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('statut', 'nouveau'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('statut', 'qualifie'),
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('statut', 'planifie'),
      supabase.from('leads').select('*, source:sources(nom)').order('created_at', { ascending: false }).limit(5),
      supabase.from('tasks_relances').select('*, lead:leads(nom, prenom, telephone)').eq('statut', 'en_attente').order('echeance', { ascending: true }).limit(5),
      supabase
        .from('leads')
        .select('statut, created_at, nb_tentatives_appel, dernier_contact, escalade_le')
        .eq('statut', 'nouveau')
        .is('dernier_contact', null)
        .is('escalade_le', null)
        .limit(200),
    ])

    totalLeads = totalLeadsData
    newLeadsCount = newLeadsData
    qualifiedCount = qualifiedData
    rdvCount = rdvData
    recentLeads = recentLeadsData
    urgentTasks = urgentTasksData
    slaLeads = slaLeadsData
  }

  const slaInfo = (slaLeads ?? []).map(lead => computeLeadSla(lead))
  const slaAttention = slaInfo.filter(s => s.eligible && s.level === 'attention').length
  const slaDepasse = slaInfo.filter(s => s.eligible && s.level === 'depasse').length
  const slaOldest = slaInfo
    .filter(s => s.eligible)
    .reduce((max, s) => Math.max(max, s.minutesEcoulees), 0)
  const slaTotal = slaAttention + slaDepasse

  const stats = [
    {
      label: 'Total leads',
      value: totalLeads ?? 0,
      change: '+14% ce mois',
      icon: Users,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
    },
    {
      label: 'Nouveaux à traiter',
      value: newLeadsCount ?? 0,
      change: 'Priorité CRC',
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Qualifiés CRC',
      value: qualifiedCount ?? 0,
      change: 'Taux transf. 36%',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'RDV Showroom',
      value: rdvCount ?? 0,
      change: 'Semaine en cours',
      icon: Calendar,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  const displayLeads = recentLeads ?? []
  const displayTasks = urgentTasks ?? []

  const slaTone =
    slaDepasse > 0
      ? {
          wrap: 'border-red-200 bg-red-50',
          iconBox: 'bg-red-100 text-red-600',
          title: 'text-red-900',
          text: 'text-red-700',
          link: 'text-red-900 hover:bg-red-100',
        }
      : slaTotal > 0
        ? {
            wrap: 'border-amber-200 bg-amber-50',
            iconBox: 'bg-amber-100 text-amber-600',
            title: 'text-amber-900',
            text: 'text-amber-700',
            link: 'text-amber-900 hover:bg-amber-100',
          }
        : {
            wrap: 'border-emerald-200 bg-emerald-50',
            iconBox: 'bg-emerald-100 text-emerald-600',
            title: 'text-emerald-900',
            text: 'text-emerald-700',
            link: 'text-emerald-900 hover:bg-emerald-100',
          }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">Vue d’ensemble</p>
          <h2 className="page-title mt-1">
            Bonjour{profile?.prenom ? `, ${profile.prenom}` : ''}
          </h2>
          <p className="page-subtitle">
            Voici l’état de votre pipeline commercial aujourd’hui.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/leads" className="btn-secondary">
            Voir tous les leads
          </Link>
          <Link href="/crc/file" className="btn-primary">
            <PhoneCall className="h-4 w-4" />
            Lancer les appels CRC
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="kpi-card">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  {stat.label}
                </p>
                <p className="kpi-value mt-2">{stat.value}</p>
                <p className="mt-1 text-xs text-gray-400">{stat.change}</p>
              </div>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}
              >
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          )
        })}
      </div>

      {/* SLA banner */}
      <div
        className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${slaTone.wrap}`}
      >
        <div className="flex flex-1 items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${slaTone.iconBox}`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${slaTone.title}`}>
              SLA premier appel · moins de 15 min
            </p>
            <p className={`mt-0.5 text-xs leading-relaxed ${slaTone.text}`}>
              {slaTotal === 0
                ? 'Tous les nouveaux leads ont été contactés dans les délais. Aucune alerte SLA en cours.'
                : `${slaTotal} nouveau${slaTotal > 1 ? 'x' : ''} lead${
                    slaTotal > 1 ? 's' : ''
                  } en attente${
                    slaOldest > 0 ? ` — le plus ancien depuis ${formatMinutes(slaOldest)}` : ''
                  }.${slaDepasse > 0 ? ` ${slaDepasse} dépasse(nt) le seuil d’escalade de 60 min.` : ''}`}
            </p>
          </div>
        </div>
        <Link
          href={slaDepasse > 0 ? '/crc/supervision' : '/crc/file'}
          className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${slaTone.link}`}
        >
          {slaDepasse > 0 ? 'Superviser' : 'Traiter'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent leads */}
        <div className="table-shell xl:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Derniers leads enregistrés
            </h3>
            <Link
              href="/leads"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Voir tout
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="table-head border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 font-semibold">Lead</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                  <th className="px-5 py-3 text-right font-semibold">Arrivé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayLeads.map((lead: any) => {
                  const statusObj = LEAD_STATUSES.find(s => s.value === lead.statut)
                  return (
                    <tr
                      key={lead.id}
                      className="h-14 transition-colors hover:bg-gray-50/70"
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">
                          {lead.prenom} {lead.nom}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-gray-400">
                          {formatTelephone(lead.telephone)}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {lead.source?.nom ?? 'Direct'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`badge ${statusObj?.bgColor} ${statusObj?.textColor}`}
                        >
                          {statusObj?.label ?? lead.statut}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-gray-400">
                        {formatTimeAgo(lead.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Urgent follow-ups */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Relances urgentes
            </h3>
            <Link
              href="/taches"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Gérer
            </Link>
          </div>

          <div className="flex-1 space-y-2.5 p-4">
            {displayTasks.map((task: any) => {
              const isRdv =
                task.type === 'confirmation_rdv' ||
                (task.type && String(task.type).includes('rdv'))
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3 transition-colors hover:bg-gray-50"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                      isRdv
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-brand-50 text-brand-600'
                    }`}
                  >
                    {isRdv ? (
                      <Calendar className="h-4 w-4" />
                    ) : (
                      <PhoneCall className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-gray-900">
                      {isRdv ? 'Confirmation RDV J-1' : 'Rappel client'}
                      {task.lead
                        ? ` · ${task.lead.prenom ?? ''} ${task.lead.nom ?? ''}`.trim()
                        : ''}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                      {task.notes ?? '—'}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-gray-400">
                      {formatTimeAgo(task.echeance)}
                    </p>
                  </div>
                </div>
              )
            })}
            {displayTasks.length === 0 && (
              <p className="py-8 text-center text-xs text-gray-400">
                Aucune relance urgente. Bon travail !
              </p>
            )}
          </div>

          <div className="border-t border-gray-100 p-4">
            <Link
              href="/taches"
              className="btn-secondary w-full text-xs"
            >
              Voir toutes mes tâches
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
