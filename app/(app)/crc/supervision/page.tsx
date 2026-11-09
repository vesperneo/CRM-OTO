import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import SupervisionView, {
  type AgentRow,
  type SupervisionMetrics,
} from '@/components/crc/SupervisionView'
import type { SlaLeadItem } from '@/components/crc/SlaBoard'
import type { ProfileOption } from '@/components/appointments/types'
import { computeLeadSla } from '@/lib/sla'

function startOfToday(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default async function SupervisionPage() {
  let agents: AgentRow[] = []
  let agentOptions: ProfileOption[] = []
  let slaLeads: SlaLeadItem[] = []
  let metrics: SupervisionMetrics = {
    enAttente: 0,
    slaDepasse: 0,
    appelsJour: 0,
    rdvConfirmes: 0,
    tauxConversion: 0,
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    const today = startOfToday()

    try {
      const [profilesResult, statusResult, callsResult, apptsResult, leadsResult, slaResult] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id, nom, prenom, email, role')
            .eq('role', 'agent_crc')
            .eq('actif', true),
          supabase.from('agent_status').select('agent_id, statut, depuis'),
          supabase.from('calls').select('agent_id').gte('debut', today),
          supabase
            .from('appointments')
            .select('id, pris_par_id, statut, debut, created_at')
            .gte('created_at', today),
          supabase
            .from('leads')
            .select('assigne_crc_a, statut')
            .not('statut', 'in', '("gagne","perdu","ne_pas_rappeler","doublon")'),
          supabase
            .from('leads')
            .select(
              'id, nom, prenom, telephone, statut, created_at, nb_tentatives_appel, dernier_contact, escalade_le, assigne_crc_a, assigne:profiles!leads_assigne_crc_a_fkey(nom, prenom), source:sources(nom)'
            )
            .eq('statut', 'nouveau')
            .is('dernier_contact', null)
            .is('escalade_le', null)
            .order('created_at', { ascending: true })
            .limit(50),
        ])

      const profiles = (profilesResult.data ?? []) as {
        id: string
        nom: string
        prenom?: string | null
        email?: string | null
        role?: string
      }[]

      const statusByAgent = new Map<string, { statut: string; depuis: string }>()
      for (const row of (statusResult.data ?? []) as {
        agent_id: string
        statut: string
        depuis: string
      }[]) {
        statusByAgent.set(row.agent_id, { statut: row.statut, depuis: row.depuis })
      }

      const callsByAgent = new Map<string, number>()
      for (const call of (callsResult.data ?? []) as { agent_id: string }[]) {
        callsByAgent.set(call.agent_id, (callsByAgent.get(call.agent_id) ?? 0) + 1)
      }

      const rdvByAgent = new Map<string, number>()
      for (const appt of (apptsResult.data ?? []) as {
        pris_par_id: string | null
        statut: string
      }[]) {
        if (appt.statut === 'annule' || !appt.pris_par_id) continue
        rdvByAgent.set(appt.pris_par_id, (rdvByAgent.get(appt.pris_par_id) ?? 0) + 1)
      }

      const chargeByAgent = new Map<string, number>()
      for (const lead of (leadsResult.data ?? []) as { assigne_crc_a: string | null }[]) {
        if (!lead.assigne_crc_a) continue
        chargeByAgent.set(
          lead.assigne_crc_a,
          (chargeByAgent.get(lead.assigne_crc_a) ?? 0) + 1
        )
      }

      agents = profiles.map((profile) => {
        const status = statusByAgent.get(profile.id)
        return {
          id: profile.id,
          nom: profile.nom,
          prenom: profile.prenom ?? null,
          email: profile.email ?? null,
          statut: status?.statut ?? 'hors_ligne',
          depuis: status?.depuis ?? null,
          appelsJour: callsByAgent.get(profile.id) ?? 0,
          rdvPris: rdvByAgent.get(profile.id) ?? 0,
          charge: chargeByAgent.get(profile.id) ?? 0,
        }
      })

      agentOptions = profiles.map((profile) => ({
        id: profile.id,
        nom: profile.nom,
        prenom: profile.prenom ?? null,
        role: profile.role,
      }))

      slaLeads = (slaResult.data ?? []) as unknown as SlaLeadItem[]

      const now = new Date()
      const slaDepasse = slaLeads.filter(
        (lead) => computeLeadSla(lead, now).level === 'depasse'
      ).length
      const appelsJour = agents.reduce((sum, agent) => sum + agent.appelsJour, 0)
      const rdvConfirmes = (apptsResult.data ?? []).filter(
        (appt: any) => appt.statut === 'confirme' || appt.statut === 'effectue'
      ).length
      const enAttente = (leadsResult.data ?? []).length

      metrics = {
        enAttente,
        slaDepasse,
        appelsJour,
        rdvConfirmes,
        tauxConversion: appelsJour > 0 ? (rdvConfirmes / appelsJour) * 100 : 0,
      }
    } catch {
      agents = []
    }
  }

  return (
    <SupervisionView
      initialAgents={agents}
      initialMetrics={metrics}
      slaLeads={slaLeads}
      agentOptions={agentOptions}
    />
  )
}
