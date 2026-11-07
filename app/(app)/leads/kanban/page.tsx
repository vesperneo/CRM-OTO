import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import LeadKanban from '@/components/leads/LeadKanban'

export default async function KanbanPage() {
  let leads: any[] | null = null

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    const { data } = await supabase
      .from('leads')
      .select('*, source:sources(nom), site_prefere:sites(nom)')
      .order('created_at', { ascending: false })
    leads = data
  }

  const fallbackLeads = [
    {
      id: 'demo-1',
      nom: 'Bennani',
      prenom: 'Youssef',
      telephone: '+212661234567',
      statut: 'nouveau',
      interet_produit: 'SUV Hybride',
      budget: 280000,
      score: 65,
    },
    {
      id: 'demo-2',
      nom: 'El Amrani',
      prenom: 'Fatima',
      telephone: '+212662987654',
      statut: 'en_qualification_crc',
      interet_produit: 'Berline Compacte',
      budget: 350000,
      score: 80,
    },
    {
      id: 'demo-3',
      nom: 'Tazi',
      prenom: 'Mehdi',
      telephone: '+212663112233',
      statut: 'rdv_planifie',
      interet_produit: 'Électrique',
      budget: 420000,
      score: 90,
    },
    {
      id: 'demo-4',
      nom: 'Chraibi',
      prenom: 'Salma',
      telephone: '+212664445566',
      statut: 'qualifie',
      interet_produit: 'Crossover',
      budget: 220000,
      score: 75,
    },
    {
      id: 'demo-5',
      nom: 'Alj',
      prenom: 'Amine',
      telephone: '+212665556677',
      statut: 'rdv_confirme',
      interet_produit: 'SUV Familial',
      budget: 480000,
      score: 95,
    },
    {
      id: 'demo-6',
      nom: 'Kabbaj',
      prenom: 'Hassan',
      telephone: '+212666667788',
      statut: 'rdv_effectue',
      interet_produit: 'Coupé',
      budget: 520000,
      score: 85,
    },
  ]

  const items = leads && leads.length > 0 ? leads : fallbackLeads

  return <LeadKanban initialLeads={items} />
}

