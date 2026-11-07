import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import ComplianceView, {
  type AuditRow,
  type ComplianceStats,
  type DataRequestRow,
  type DncRow,
  type LeadOptionLite,
} from '@/components/compliance/ComplianceView'
import type { RetentionPolicy } from '@/features/compliance/actions'

const DEFAULT_POLICY: RetentionPolicy = {
  retention_leads_mois: 36,
  retention_appels_mois: 24,
  retenion_audit_mois: 60,
  responsable: 'Délégué à la protection des données Otoclic',
}

function demoRequests(): DataRequestRow[] {
  return [
    {
      id: 'demo-req-1',
      lead_id: 'demo-lead-1',
      type: 'effacement',
      statut: 'nouvelle',
      demandeur_nom: 'Youssef Bennani',
      demandeur_contact: 'youssef.bennani@example.ma',
      motif: 'Demande de suppression de mes données après achat.',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lead: { nom: 'Bennani', prenom: 'Youssef', telephone: '+212661234567' },
      __demo: true,
    },
    {
      id: 'demo-req-2',
      type: 'acces',
      statut: 'traitee',
      demandeur_nom: 'Fatima El Amrani',
      demandeur_contact: 'fatima.elamrani@example.ma',
      motif: 'Je souhaite consulter les données conservées me concernant.',
      reponse: 'Extrait transmis par email le 02/05/2026.',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      traite_le: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      __demo: true,
    },
  ]
}

function demoDnc(): DncRow[] {
  return [
    {
      telephone: '+212661000111',
      telephone_normalise: '+212661000111',
      raison: 'Opposition au démarchage téléphonique',
      date_ajout: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      __demo: true,
    },
    {
      telephone: '+212662222333',
      telephone_normalise: '+212662222333',
      raison: 'Demande explicite du prospect',
      date_ajout: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      __demo: true,
    },
  ]
}

function demoLeads(): LeadOptionLite[] {
  return [
    { id: 'demo-lead-1', nom: 'Bennani', prenom: 'Youssef', telephone: '+212661234567' },
    { id: 'demo-lead-2', nom: 'El Amrani', prenom: 'Fatima', telephone: '+212662987654' },
    { id: 'demo-lead-3', nom: 'Tazi', prenom: 'Mehdi', telephone: '+212663112233' },
  ]
}

function demoAudit(): AuditRow[] {
  return [
    {
      id: 1,
      table_name: 'leads',
      record_id: 'demo-lead-1',
      operation: 'UPDATE',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      auteur: { nom: 'Alami', prenom: 'Karim' },
    },
    {
      id: 2,
      table_name: 'appointments',
      record_id: 'demo-rdv-2',
      operation: 'INSERT',
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      auteur: { nom: 'Mansouri', prenom: 'Sara' },
    },
    {
      id: 3,
      table_name: 'leads',
      record_id: 'demo-lead-9',
      operation: 'DELETE',
      created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      auteur: { nom: 'Système', prenom: null },
    },
  ]
}

export default async function CompliancePage() {
  let stats: ComplianceStats = {
    leadsTotal: 0,
    consentCount: 0,
    consentRate: 0,
    dncCount: 0,
    pendingRequests: 0,
  }
  let dataRequests: DataRequestRow[] = []
  let dncEntries: DncRow[] = []
  let auditLogs: AuditRow[] = []
  let leads: LeadOptionLite[] = []
  let policy = DEFAULT_POLICY

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    try {
      const [leadsCount, consentCount, dncResult, requestsResult, settingsResult, auditResult, leadsResult] =
        await Promise.all([
          supabase.from('leads').select('*', { count: 'exact', head: true }),
          supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('consentement_contact', true),
          supabase.from('dnc_list').select('*').order('date_ajout', { ascending: false }),
          supabase
            .from('data_requests')
            .select('*, lead:leads(nom, prenom, telephone)')
            .order('created_at', { ascending: false })
            .limit(100),
          (supabase.from('integration_settings') as any)
            .select('valeur')
            .eq('cle', 'conformite')
            .maybeSingle(),
          supabase
            .from('audit_log')
            .select('*, auteur:profiles!audit_log_auteur_id_fkey(nom, prenom)')
            .order('created_at', { ascending: false })
            .limit(15),
          supabase
            .from('leads')
            .select('id, nom, prenom, telephone')
            .order('created_at', { ascending: false })
            .limit(200),
        ])

      const total = leadsCount.count ?? 0
      const consent = consentCount.count ?? 0

      dataRequests = (requestsResult.data ?? []) as unknown as DataRequestRow[]
      dncEntries = (dncResult.data ?? []) as unknown as DncRow[]
      auditLogs = (auditResult.data ?? []) as unknown as AuditRow[]
      leads = (leadsResult.data ?? []) as LeadOptionLite[]

      const settings = settingsResult?.data?.valeur as Partial<RetentionPolicy> | null
      if (settings) {
        policy = {
          retention_leads_mois:
            settings.retention_leads_mois ?? DEFAULT_POLICY.retention_leads_mois,
          retention_appels_mois:
            settings.retention_appels_mois ?? DEFAULT_POLICY.retention_appels_mois,
          retenion_audit_mois:
            settings.retenion_audit_mois ?? DEFAULT_POLICY.retenion_audit_mois,
          responsable: settings.responsable ?? DEFAULT_POLICY.responsable,
        }
      }

      stats = {
        leadsTotal: total,
        consentCount: consent,
        consentRate: total > 0 ? (consent / total) * 100 : 0,
        dncCount: dncEntries.length,
        pendingRequests: dataRequests.filter(
          (r) => r.statut === 'nouvelle' || r.statut === 'en_cours'
        ).length,
      }
    } catch {
      dataRequests = []
    }
  }

  const useDemo = leads.length === 0

  if (useDemo) {
    dataRequests = demoRequests()
    dncEntries = demoDnc()
    auditLogs = demoAudit()
    leads = demoLeads()
    stats = {
      leadsTotal: 124,
      consentCount: 112,
      consentRate: 90.3,
      dncCount: dncEntries.length,
      pendingRequests: 1,
    }
    policy = DEFAULT_POLICY
  }

  return (
    <ComplianceView
      stats={stats}
      dataRequests={dataRequests}
      dncEntries={dncEntries}
      auditLogs={auditLogs}
      leads={leads}
      policy={policy}
      isDemo={useDemo}
    />
  )
}