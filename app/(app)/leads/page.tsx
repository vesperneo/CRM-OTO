import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import { LEAD_SOURCES } from '@/lib/constants'
import LeadsView from '@/components/leads/LeadsView'

export default async function LeadsPage() {
  let leads: any[] | null = null
  let sources: any[] | null = null
  let sites: any[] | null = null
  const configured = isSupabaseConfigured()

  if (configured) {
    const supabase = await createClient()

    const [leadsResult, sourcesResult, sitesResult] = await Promise.all([
      supabase
        .from('leads')
        .select('*, source:sources(nom), site_prefere:sites(nom)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('sources').select('id, nom').eq('actif', true),
      supabase.from('sites').select('id, nom, ville').eq('actif', true),
    ])

    leads = leadsResult.data
    sources = sourcesResult.data
    sites = sitesResult.data
  }

  // Demo fallback leads
  const fallbackLeads = [
    {
      id: 'demo-1',
      nom: 'Bennani',
      prenom: 'Youssef',
      telephone: '+212661234567',
      statut: 'nouveau',
      source: { nom: 'Facebook Ads' },
      site_prefere: { nom: 'Showroom Casa Centre' },
      interet_produit: 'SUV Hybride',
      budget: 280000,
      score: 65,
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'demo-2',
      nom: 'El Amrani',
      prenom: 'Fatima',
      telephone: '+212662987654',
      statut: 'en_qualification_crc',
      source: { nom: 'Formulaire site web' },
      site_prefere: { nom: 'Showroom Rabat Agdal' },
      interet_produit: 'Berline Compacte',
      budget: 350000,
      score: 80,
      created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: 'demo-3',
      nom: 'Tazi',
      prenom: 'Mehdi',
      telephone: '+212663112233',
      statut: 'rdv_planifie',
      source: { nom: 'Google Ads' },
      site_prefere: { nom: 'Showroom Casa Centre' },
      interet_produit: 'Électrique',
      budget: 420000,
      score: 90,
      created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
    {
      id: 'demo-4',
      nom: 'Chraibi',
      prenom: 'Salma',
      telephone: '+212664445566',
      statut: 'qualifie',
      source: { nom: 'TikTok Ads' },
      site_prefere: { nom: 'Showroom Marrakech' },
      interet_produit: 'Crossover',
      budget: 220000,
      score: 75,
      created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    },
  ]

  const items = leads && leads.length > 0 ? leads : fallbackLeads

  return (
    <LeadsView
      initialLeads={items}
      sources={configured ? (sources ?? []) : LEAD_SOURCES}
      sites={sites ?? []}
    />
  )
}
