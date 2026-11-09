import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import AnalyticsView, {
  type AnalyticsTotals,
  type AgentPerfRow,
  type DailyAppointmentsRow,
  type DailyCallsRow,
  type DailyLeadsRow,
  type FunnelRow,
  type SourceRow,
} from '@/components/analytics/AnalyticsView'

const DAYS = 90

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function dayKeys(days = DAYS): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    keys.push(format(d, 'yyyy-MM-dd'))
  }
  return keys
}

function alignDaily<T extends { jour: string }>(
  rows: T[],
  keys: string[],
  make: (jour: string, row?: T) => T
): T[] {
  const map = new Map<string, T>()
  for (const row of rows) {
    const jour = String(row.jour).slice(0, 10)
    map.set(jour, row)
  }
  return keys.map((jour) => make(jour, map.get(jour)))
}

export default async function AnalyticsPage() {
  let dailyLeads: DailyLeadsRow[] = []
  let dailyCalls: DailyCallsRow[] = []
  let dailyAppointments: DailyAppointmentsRow[] = []
  let funnel: FunnelRow[] = []
  let sources: SourceRow[] = []
  let agents: AgentPerfRow[] = []
  let totals: AnalyticsTotals = { caGenere: 0, escalades: 0 }

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    try {
      const since = new Date()
      since.setDate(since.getDate() - 30)

      const [funnelResult, leadsDailyResult, callsDailyResult, apptDailyResult, sourcesResult, agentsResult, wonResult, escaladeResult] =
        await Promise.all([
          (supabase.from('v_leads_funnel') as any).select('*'),
          (supabase.from('v_leads_daily') as any).select('*'),
          (supabase.from('v_calls_daily') as any).select('*'),
          (supabase.from('v_appointments_daily') as any).select('*'),
          (supabase.from('v_sources_performance') as any).select('*'),
          (supabase.from('v_agent_performance') as any).select('*'),
          supabase.from('leads').select('budget').eq('statut', 'gagne'),
          supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .not('escalade_le', 'is', null)
            .gte('created_at', since.toISOString()),
        ])

      if (funnelResult.error) throw funnelResult.error

      const keys = dayKeys()

      funnel = ((funnelResult.data ?? []) as FunnelRow[]).map((row) => ({
        statut: row.statut,
        total: toNumber(row.total),
        trente_jours: toNumber(row.trente_jours),
      }))

      const leadsRows = (leadsDailyResult.data ?? []) as { jour: string; total: number }[]
      dailyLeads = alignDaily<DailyLeadsRow>(leadsRows, keys, (jour, row) => ({
        jour,
        total: toNumber(row?.total),
      }))

      const callsRows = (callsDailyResult.data ?? []) as DailyCallsRow[]
      dailyCalls = alignDaily<DailyCallsRow>(callsRows, keys, (jour, row) => ({
        jour,
        appels: toNumber(row?.appels),
        duree_moyenne: toNumber(row?.duree_moyenne),
        agents_actifs: toNumber(row?.agents_actifs),
      }))

      const apptRows = (apptDailyResult.data ?? []) as DailyAppointmentsRow[]
      dailyAppointments = alignDaily<DailyAppointmentsRow>(apptRows, keys, (jour, row) => ({
        jour,
        total: toNumber(row?.total),
        confirmes: toNumber(row?.confirmes),
        effectues: toNumber(row?.effectues),
        absents: toNumber(row?.absents),
      }))

      sources = ((sourcesResult.data ?? []) as SourceRow[]).map((row) => ({
        source: row.source,
        leads: toNumber(row.leads),
        qualifies: toNumber(row.qualifies),
        rdv: toNumber(row.rdv),
        gagnes: toNumber(row.gagnes),
        taux_rdv: toNumber(row.taux_rdv),
      }))

      agents = ((agentsResult.data ?? []) as AgentPerfRow[]).map((row) => ({
        id: row.id,
        agent: row.agent,
        role: row.role,
        appels: toNumber(row.appels),
        rdv_pris: toNumber(row.rdv_pris),
        leads_traites: toNumber(row.leads_traites),
      }))

      const caGenere = ((wonResult.data ?? []) as { budget: number | null }[]).reduce(
        (sum, row) => sum + toNumber(row.budget),
        0
      )

      totals = {
        caGenere,
        escalades: escaladeResult.count ?? 0,
      }
    } catch {
      dailyLeads = []
    }
  }

  return (
    <AnalyticsView
      funnel={funnel}
      dailyLeads={dailyLeads}
      dailyCalls={dailyCalls}
      dailyAppointments={dailyAppointments}
      sources={sources}
      agents={agents}
      totals={totals}
    />
  )
}
