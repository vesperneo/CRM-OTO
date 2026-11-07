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

function demoData() {
  const keys = dayKeys()
  const dailyLeads: DailyLeadsRow[] = keys.map((jour, i) => ({
    jour,
    total: 8 + Math.round(6 * Math.abs(Math.sin(i / 5))) + (i % 7 === 0 ? 5 : 0),
  }))
  const dailyCalls: DailyCallsRow[] = keys.map((jour, i) => ({
    jour,
    appels: 20 + Math.round(14 * Math.abs(Math.cos(i / 6))) + (i % 5 === 0 ? 8 : 0),
    duree_moyenne: 130 + Math.round(40 * Math.abs(Math.sin(i / 8))),
    agents_actifs: 3 + (i % 3),
  }))
  const dailyAppointments: DailyAppointmentsRow[] = keys.map((jour, i) => {
    const total = 3 + Math.round(4 * Math.abs(Math.sin(i / 4)))
    const absents = i % 6 === 0 ? 1 : 0
    const effectues = Math.max(0, total - absents - (i % 4 === 0 ? 1 : 0))
    return {
      jour,
      total,
      confirmes: Math.max(0, total - absents - 1),
      effectues,
      absents,
    }
  })

  const funnel: FunnelRow[] = [
    { statut: 'nouveau', total: 124, trente_jours: 45 },
    { statut: 'en_qualification_crc', total: 98, trente_jours: 38 },
    { statut: 'qualifie', total: 72, trente_jours: 27 },
    { statut: 'rdv_planifie', total: 51, trente_jours: 19 },
    { statut: 'rdv_confirme', total: 38, trente_jours: 15 },
    { statut: 'rdv_effectue', total: 29, trente_jours: 12 },
    { statut: 'proposition', total: 17, trente_jours: 8 },
    { statut: 'gagne', total: 11, trente_jours: 5 },
    { statut: 'perdu', total: 23, trente_jours: 9 },
    { statut: 'injoignable', total: 19, trente_jours: 7 },
    { statut: 'a_rappeler', total: 14, trente_jours: 5 },
  ]

  const sources: SourceRow[] = [
    { source: 'Meta Lead Ads', leads: 186, qualifies: 92, rdv: 54, gagnes: 9, taux_rdv: 29 },
    { source: 'Google Ads', leads: 124, qualifies: 61, rdv: 33, gagnes: 6, taux_rdv: 26.6 },
    { source: 'Site web', leads: 78, qualifies: 44, rdv: 27, gagnes: 4, taux_rdv: 34.6 },
    { source: 'WhatsApp entrant', leads: 45, qualifies: 30, rdv: 18, gagnes: 3, taux_rdv: 40 },
    { source: 'Appel entrant', leads: 32, qualifies: 21, rdv: 12, gagnes: 2, taux_rdv: 37.5 },
  ]

  const agents: AgentPerfRow[] = [
    { id: 'a1', agent: 'Sara Mansouri', appels: 412, rdv_pris: 61, leads_traites: 188 },
    { id: 'a2', agent: 'Karim Alami', appels: 356, rdv_pris: 47, leads_traites: 164 },
    { id: 'a3', agent: 'Yassine Berrada', appels: 298, rdv_pris: 33, leads_traites: 141 },
    { id: 'a4', agent: 'Hind El Fassi', appels: 201, rdv_pris: 19, leads_traites: 96 },
  ]

  const totals: AnalyticsTotals = { caGenere: 4_250_000, escalades: 6 }

  return { dailyLeads, dailyCalls, dailyAppointments, funnel, sources, agents, totals }
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

  const useDemo = funnel.length === 0

  if (useDemo) {
    const demo = demoData()
    return <AnalyticsView {...demo} />
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