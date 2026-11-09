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

  return (
    <ComplianceView
      stats={stats}
      dataRequests={dataRequests}
      dncEntries={dncEntries}
      auditLogs={auditLogs}
      leads={leads}
      policy={policy}
    />
  )
}
