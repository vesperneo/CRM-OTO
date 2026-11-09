import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import AppointmentsView from '@/components/appointments/AppointmentsView'
import type {
  AppointmentItem,
  LeadOption,
  ProfileOption,
  SiteOption,
} from '@/components/appointments/types'

export default async function AppointmentsPage() {
  let appointments: AppointmentItem[] = []
  let sites: SiteOption[] = []
  let leads: LeadOption[] = []
  let profiles: ProfileOption[] = []

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    try {
      const [appointmentsResult, sitesResult, leadsResult, profilesResult] =
        await Promise.all([
          supabase
            .from('appointments')
            .select(
              '*, lead:leads(id, nom, prenom, telephone, email), site:sites(id, nom, ville, adresse), assigne_a:profiles!appointments_assigne_a_id_fkey(nom, prenom), pris_par:profiles!appointments_pris_par_id_fkey(nom, prenom)'
            )
            .order('debut', { ascending: true })
            .limit(300),
          supabase.from('sites').select('id, nom, ville').eq('actif', true),
          supabase
            .from('leads')
            .select('id, nom, prenom, telephone, site_prefere_id')
            .not('statut', 'in', '("gagne","perdu","ne_pas_rappeler","doublon")')
            .order('created_at', { ascending: false })
            .limit(200),
          supabase
            .from('profiles')
            .select('id, nom, prenom, role')
            .in('role', ['commercial', 'responsable_site', 'admin', 'agent_crc'])
            .eq('actif', true),
        ])

      appointments = (appointmentsResult.data ?? []) as unknown as AppointmentItem[]
      sites = (sitesResult.data ?? []) as SiteOption[]
      leads = (leadsResult.data ?? []) as LeadOption[]
      profiles = (profilesResult.data ?? []) as ProfileOption[]
    } catch {
      appointments = []
    }
  }

  return (
    <AppointmentsView
      initialAppointments={appointments}
      sites={sites}
      leads={leads}
      profiles={profiles}
    />
  )
}
