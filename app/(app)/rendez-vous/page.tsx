import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import AppointmentsView from '@/components/appointments/AppointmentsView'
import type {
  AppointmentItem,
  LeadOption,
  ProfileOption,
  SiteOption,
} from '@/components/appointments/types'

function at(offsetDays: number, hours: number, minutes = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

function endOf(debutIso: string, minutes: number): string {
  return new Date(new Date(debutIso).getTime() + minutes * 60_000).toISOString()
}

const DEMO_SITES: SiteOption[] = [
  { id: 'site-casa', nom: 'Showroom Casa Centre', ville: 'Casablanca' },
  { id: 'site-rabat', nom: 'Showroom Rabat Agdal', ville: 'Rabat' },
  { id: 'site-marrakech', nom: 'Showroom Marrakech', ville: 'Marrakech' },
]

const DEMO_PROFILES: ProfileOption[] = [
  { id: 'demo-com-1', nom: 'Alami', prenom: 'Hassan', role: 'commercial' },
  { id: 'demo-com-2', nom: 'Tazi', prenom: 'Reda', role: 'commercial' },
  { id: 'demo-com-3', nom: 'Ben', prenom: 'Anas', role: 'commercial' },
]

const DEMO_LEADS: LeadOption[] = [
  {
    id: 'demo-lead-1',
    nom: 'Bennani',
    prenom: 'Youssef',
    telephone: '+212661234567',
    site_prefere_id: 'site-casa',
  },
  {
    id: 'demo-lead-2',
    nom: 'El Amrani',
    prenom: 'Fatima',
    telephone: '+212662987654',
    site_prefere_id: 'site-rabat',
  },
  {
    id: 'demo-lead-3',
    nom: 'Chraibi',
    prenom: 'Salma',
    telephone: '+212664445566',
    site_prefere_id: 'site-marrakech',
  },
]

const DEMO_APPOINTMENTS: AppointmentItem[] = [
  {
    id: 'demo-rdv-1',
    lead_id: 'demo-lead-1',
    site_id: 'site-casa',
    assigne_a_id: 'demo-com-1',
    debut: at(0, 15, 30),
    fin: endOf(at(0, 15, 30), 60),
    type: 'showroom',
    statut: 'confirme',
    confirme_par_crc_le: at(-1, 10),
    token_public: '00000000-0000-4000-8000-000000000001',
    lead: {
      id: 'demo-lead-1',
      nom: 'Bennani',
      prenom: 'Youssef',
      telephone: '+212661234567',
      email: 'youssef.bennani@example.ma',
    },
    site: { id: 'site-casa', nom: 'Showroom Casa Centre', ville: 'Casablanca' },
    assigne_a: { nom: 'Alami', prenom: 'Hassan' },
    notes_crc: 'Souhaite essayer le SUV hybride en fin de journée.',
    __demo: true,
  },
  {
    id: 'demo-rdv-2',
    lead_id: 'demo-lead-2',
    site_id: 'site-rabat',
    assigne_a_id: 'demo-com-2',
    debut: at(1, 10, 30),
    fin: endOf(at(1, 10, 30), 60),
    type: 'showroom',
    statut: 'planifie',
    token_public: '00000000-0000-4000-8000-000000000002',
    lead: {
      id: 'demo-lead-2',
      nom: 'El Amrani',
      prenom: 'Fatima',
      telephone: '+212662987654',
      email: 'fatima.elamrani@example.ma',
    },
    site: { id: 'site-rabat', nom: 'Showroom Rabat Agdal', ville: 'Rabat' },
    assigne_a: { nom: 'Tazi', prenom: 'Reda' },
    notes_crc: 'Demande un devis LOA pour une berline compacte.',
    __demo: true,
  },
  {
    id: 'demo-rdv-3',
    lead_id: 'demo-lead-3',
    site_id: 'site-marrakech',
    assigne_a_id: 'demo-com-3',
    debut: at(2, 16, 0),
    fin: endOf(at(2, 16, 0), 90),
    type: 'showroom',
    statut: 'planifie',
    token_public: '00000000-0000-4000-8000-000000000003',
    lead: {
      id: 'demo-lead-3',
      nom: 'Chraibi',
      prenom: 'Salma',
      telephone: '+212664445566',
      email: 'salma.chraibi@example.ma',
    },
    site: { id: 'site-marrakech', nom: 'Showroom Marrakech', ville: 'Marrakech' },
    assigne_a: { nom: 'Ben', prenom: 'Anas' },
    notes_crc: 'Crossover familial, essai avec siège bébé.',
    __demo: true,
  },
  {
    id: 'demo-rdv-4',
    lead_id: 'demo-lead-1',
    site_id: 'site-casa',
    assigne_a_id: 'demo-com-1',
    debut: at(-3, 11, 0),
    fin: endOf(at(-3, 11, 0), 60),
    type: 'appel',
    statut: 'effectue',
    token_public: '00000000-0000-4000-8000-000000000004',
    lead: {
      id: 'demo-lead-1',
      nom: 'Bennani',
      prenom: 'Youssef',
      telephone: '+212661234567',
    },
    site: { id: 'site-casa', nom: 'Showroom Casa Centre', ville: 'Casablanca' },
    assigne_a: { nom: 'Alami', prenom: 'Hassan' },
    __demo: true,
  },
]

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

  const useDemo = appointments.length === 0 && leads.length === 0

  return (
    <AppointmentsView
      initialAppointments={useDemo ? DEMO_APPOINTMENTS : appointments}
      sites={useDemo ? DEMO_SITES : sites}
      leads={leads.length > 0 ? leads : DEMO_LEADS}
      profiles={profiles.length > 0 ? profiles : DEMO_PROFILES}
      isDemo={useDemo}
    />
  )
}