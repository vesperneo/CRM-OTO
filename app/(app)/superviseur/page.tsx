import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Gauge,
  Headphones,
  PhoneCall,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/profile'
import { getRoleHome } from '@/lib/demo-profile'
import { AGENT_STATUSES } from '@/lib/constants'
import { computeLeadSla, formatMinutes } from '@/lib/sla'

interface AgentSnapshot {
  id: string
  nom: string
  prenom?: string | null
  statut: string
  appelsJour: number
  charge: number
}

interface SlaAlert {
  id: string
  nom: string
  prenom?: string | null
  telephone: string
  minutes: number
  level: string
}

const DEMO_AGENTS: AgentSnapshot[] = [
  { id: 'demo-agent-1', nom: 'Berrada', prenom: 'Yassine', statut: 'en_appel', appelsJour: 28, charge: 12 },
  { id: 'demo-agent-2', nom: 'Bennis', prenom: 'Amina', statut: 'disponible', appelsJour: 34, charge: 9 },
  { id: 'demo-agent-3', nom: 'Chraibi', prenom: 'Omar', statut: 'pause', appelsJour: 19, charge: 17 },
  { id: 'demo-agent-4', nom: 'Lahlou', prenom: 'Mehdi', statut: 'en_formation', appelsJour: 6, charge: 5 },
  { id: 'demo-agent-5', nom: 'El Fassi', prenom: 'Hind', statut: 'hors_ligne', appelsJour: 0, charge: 0 },
]

const DEMO_ALERTS: SlaAlert[] = [
  { id: 'demo-sla-1', nom: 'Bennani', prenom: 'Youssef', telephone: '+212661234567', minutes: 82, level: 'depasse' },
  { id: 'demo-sla-2', nom: 'El Amrani', prenom: 'Fatima', telephone: '+212662987654', minutes: 47, level: 'attention' },
  { id: 'demo-sla-3', nom: 'Tazi', prenom: 'Mehdi', telephone: '+212663112233', minutes: 31, level: 'attention' },
]

const DEMO_METRICS = {
  agentsEnLigne: 4,
  totalAgents: 5,
  appelsJour: 87,
  rdvConfirmes: 12,
  slaDepasses: 1,
  tachesEnRetard: 6,
}

function statusConfig(status: string) {
  return AGENT_STATUSES.find((s) => s.value === status) ?? AGENT_STATUSES[4]
}

export default async function SupervisorPage() {
  const { profile, isDemo } = await getCurrentProfile()

  if (!profile) redirect('/login')
  if (profile.role !== 'admin' && profile.role !== 'superviseur_crc') {
    redirect(getRoleHome(profile.role))
  }

  let agents = DEMO_AGENTS
  let alerts = DEMO_ALERTS
  let metrics = DEMO_METRICS

  if (!isDemo) {
    const supabase = await createClient()
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(startOfToday)
    endOfToday.setDate(endOfToday.getDate() + 1)

    try {
      const [agentsResult, statusResult, callsResult, apptResult, slaResult, tasksResult] =
        await Promise.all([
          (supabase.from('profiles') as any)
            .select('id, nom, prenom')
            .eq('role', 'agent_crc')
            .eq('actif', true),
          (supabase.from('agent_status') as any).select('agent_id, statut'),
          (supabase.from('calls') as any)
            .select('agent_id')
            .gte('debut', startOfToday.toISOString()),
          (supabase.from('appointments') as any)
            .select('statut')
            .gte('debut', startOfToday.toISOString())
            .lt('debut', endOfToday.toISOString()),
          (supabase.from('leads') as any)
            .select(
              'id, nom, prenom, telephone, statut, created_at, nb_tentatives_appel, dernier_contact'
            )
            .eq('statut', 'nouveau')
            .is('dernier_contact', null)
            .order('created_at', { ascending: true })
            .limit(30),
          (supabase.from('tasks_relances') as any)
            .select('id', { count: 'exact', head: true })
            .eq('statut', 'en_attente')
            .lt('echeance', new Date().toISOString()),
        ])

      const statusByAgent = new Map<string, string>()
      for (const row of (statusResult.data ?? []) as {
        agent_id: string
        statut: string
      }[]) {
        statusByAgent.set(row.agent_id, row.statut)
      }

      const callsByAgent = new Map<string, number>()
      for (const call of (callsResult.data ?? []) as { agent_id: string }[]) {
        callsByAgent.set(call.agent_id, (callsByAgent.get(call.agent_id) ?? 0) + 1)
      }

      agents = ((agentsResult.data ?? []) as any[]).map((a) => ({
        id: a.id,
        nom: a.nom,
        prenom: a.prenom,
        statut: statusByAgent.get(a.id) ?? 'hors_ligne',
        appelsJour: callsByAgent.get(a.id) ?? 0,
        charge: 0,
      }))

      const now = new Date()
      const rawLeads = (slaResult.data ?? []) as any[]
      alerts = rawLeads
        .map((lead) => {
          const sla = computeLeadSla(lead, now)
          return {
            id: lead.id,
            nom: lead.nom,
            prenom: lead.prenom,
            telephone: lead.telephone,
            minutes: sla.minutesEcoulees,
            level: sla.level,
          }
        })
        .filter((lead) => lead.level === 'attention' || lead.level === 'depasse')
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 6)

      const appts = (apptResult.data ?? []) as { statut: string }[]
      metrics = {
        agentsEnLigne: agents.filter((a) => a.statut !== 'hors_ligne').length,
        totalAgents: agents.length,
        appelsJour: agents.reduce((sum, a) => sum + a.appelsJour, 0),
        rdvConfirmes: appts.filter(
          (a) => a.statut === 'confirme' || a.statut === 'effectue'
        ).length,
        slaDepasses: alerts.filter((a) => a.level === 'depasse').length,
        tachesEnRetard: tasksResult.count ?? 0,
      }
    } catch {
      agents = []
      alerts = []
    }
  }

  const kpis = [
    {
      label: 'Agents en ligne',
      value: `${metrics.agentsEnLigne}/${metrics.totalAgents}`,
      hint: 'Équipe CRC connectée',
      icon: Users,
      tone: 'bg-brand-50 text-brand-600',
    },
    {
      label: 'Appels aujourd’hui',
      value: String(metrics.appelsJour),
      hint: `${metrics.rdvConfirmes} RDV confirmés`,
      icon: PhoneCall,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Alertes SLA',
      value: String(alerts.length),
      hint: `${metrics.slaDepasses} dépassé(s)`,
      icon: AlertTriangle,
      tone: 'bg-red-50 text-red-600',
    },
    {
      label: 'Tâches en retard',
      value: String(metrics.tachesEnRetard),
      hint: 'À réaffecter ou relancer',
      icon: ClipboardList,
      tone: 'bg-amber-50 text-amber-600',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Panneau superviseur</h2>
            <p className="text-sm text-gray-500">
              Vue d’ensemble de l’équipe CRC, des SLAs et de l’activité du jour
            </p>
          </div>
        </div>
        <Link
          href="/crc/supervision"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm"
        >
          <Activity className="w-4 h-4" />
          Supervision temps réel
        </Link>
      </div>

      {isDemo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2">
          <Activity className="w-4 h-4 shrink-0" />
          Mode démonstration — utilisez le sélecteur de rôle pour passer en agent ou admin.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{kpi.hint}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Mon équipe</h3>
            <Link href="/crc/supervision" className="text-[11px] font-semibold text-brand-600">
              Gérer
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {agents.map((agent) => {
              const status = statusConfig(agent.statut)
              return (
                <div key={agent.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-[10px] font-bold">
                    {(agent.prenom?.[0] ?? '') + agent.nom[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {[agent.prenom, agent.nom].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                      {status.label}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-900">{agent.appelsJour}</p>
                    <p className="text-[10px] text-gray-400">appels</p>
                  </div>
                </div>
              )
            })}
            {agents.length === 0 && (
              <p className="text-xs text-gray-400 py-6 text-center">
                Aucun agent CRC actif.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Alertes SLA</h3>
            <span className="text-[10px] font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
              {alerts.length} lead(s)
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-3 py-2.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    alert.level === 'depasse' ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {[alert.prenom, alert.nom].filter(Boolean).join(' ')}
                  </p>
                  <p className="text-[10px] text-gray-400">{alert.telephone}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-[11px] font-bold ${
                      alert.level === 'depasse' ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {formatMinutes(alert.minutes)}
                  </p>
                  <p className="text-[10px] text-gray-400">sans contact</p>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-xs text-gray-400 py-6 text-center">
                Aucune alerte SLA en cours.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Supervision détaillée', desc: 'Temps réel & réaffectation', href: '/crc/supervision', icon: MonitorIcon },
          { label: 'Calendrier RDV', desc: 'Confirmations & planning', href: '/rendez-vous', icon: CalendarDays },
          { label: 'Analytique', desc: 'Performance de l’équipe', href: '/analytics', icon: BarChart3 },
          { label: 'Conformité', desc: 'DNC, consentements & audit', href: '/conformite', icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-brand-300 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
              </div>
              <p className="text-xs font-semibold text-gray-900 mt-2">{item.label}</p>
              <p className="text-[10px] text-gray-400">{item.desc}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function MonitorIcon({ className }: { className?: string }) {
  return <Headphones className={className} />
}
