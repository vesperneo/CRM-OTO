import { createClient } from '@/lib/supabase/server'
import { fetchNextLeadForAgent } from '@/features/calls/actions'
import { isSupabaseConfigured } from '@/lib/utils'
import CallQueueView, {
  type Disposition,
  type QueueLead,
  type ScriptContent,
} from '@/components/crc/CallQueueView'

const DEMO_DISPOSITIONS: Disposition[] = [
  { id: 'd1111111-1111-1111-1111-111111111111', libelle: 'Répondu – Intéressé', type: 'repond_interesse', action: 'creer_relance', action_params: { nouveau_statut: 'en_qualification_crc' }, couleur: '#10B981', ordre: 1 },
  { id: 'd2222222-2222-2222-2222-222222222222', libelle: 'Répondu – À rappeler', type: 'repond_rappeler', action: 'creer_relance', action_params: { nouveau_statut: 'a_rappeler' }, couleur: '#F59E0B', ordre: 2 },
  { id: 'd3333333-3333-3333-3333-333333333333', libelle: 'Répondu – Pas intéressé', type: 'repond_pas_interesse', action: 'changer_statut', action_params: { nouveau_statut: 'perdu' }, couleur: '#EF4444', ordre: 3 },
  { id: 'd4444444-4444-4444-4444-444444444444', libelle: 'Pas de réponse', type: 'pas_reponse', action: 'creer_relance', action_params: { cadence_auto: true }, couleur: '#6B7280', ordre: 4 },
  { id: 'd5555555-5555-5555-5555-555555555555', libelle: 'Messagerie', type: 'messagerie', action: 'creer_relance', action_params: { cadence_auto: true, envoyer_whatsapp: true }, couleur: '#6B7280', ordre: 5 },
  { id: 'd6666666-6666-6666-6666-666666666666', libelle: 'Occupé', type: 'occupe', action: 'creer_relance', action_params: { delai_relance_heures: 1 }, couleur: '#6B7280', ordre: 6 },
  { id: 'd7777777-7777-7777-7777-777777777777', libelle: 'Numéro erroné / Hors service', type: 'numero_errone', action: 'envoyer_whatsapp', action_params: { template: 'correction_numero' }, couleur: '#DC2626', ordre: 7 },
  { id: 'd8888888-8888-8888-8888-888888888888', libelle: 'RDV pris', type: 'rdv_pris', action: 'creer_rdv', action_params: { nouveau_statut: 'rdv_planifie' }, couleur: '#da3655', ordre: 8 },
  { id: 'd9999999-9999-9999-9999-999999999999', libelle: 'Doublon', type: 'doublon', action: 'changer_statut', action_params: { nouveau_statut: 'doublon' }, couleur: '#8B5CF6', ordre: 9 },
  { id: 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', libelle: 'Ne pas rappeler (DNC)', type: 'dnc', action: 'marquer_dnc', action_params: { nouveau_statut: 'ne_pas_rappeler' }, couleur: '#111827', ordre: 10 },
]

const DEMO_SCRIPT: ScriptContent = {
  accroche:
    "Bonjour M./Mme {{nom}}, je suis votre conseiller d'Otoclic. Vous avez manifesté votre intérêt pour {{produit}}. Avez-vous 2 minutes pour faire le point sur votre projet ?",
  questions_qualification: [
    "Quel est votre délai d'achat envisagé (immédiat, 1-3 mois, plus tard) ?",
    'Avez-vous un véhicule actuel à faire reprendre par notre showroom ?',
    'Envisagez-vous un financement à crédit / LOA ou un achat comptant ?',
  ],
  objections: [
    {
      objection: 'Je voulais juste voir le prix',
      reponse:
        'Je comprends tout à fait. Nos offres actuelles incluent des remises spéciales et des formules de reprise avantageuses. Quel modèle précis retenait votre attention ?',
    },
    {
      objection: "Je n'ai pas le temps",
      reponse:
        'Aucun souci, je peux vous envoyer la fiche par WhatsApp ou vous rappeler à un moment plus propice. Quel créneau vous conviendrait ?',
    },
  ],
  closing_rdv:
    'Le plus simple pour vous rendre compte est de venir l’essayer directement au showroom {{site}}. Seriez-vous disponible demain en fin de matinée ou dans l’après-midi ?',
}

const DEMO_QUEUE: QueueLead[] = [
  {
    id: 'demo-queue-1',
    nom: 'Benjelloun',
    prenom: 'Omar',
    telephone: '+212661889900',
    statut: 'nouveau',
    ville: 'Casablanca',
    interet_produit: 'SUV Hybride 2025',
    budget: 320000,
    nb_tentatives_appel: 0,
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    source: { nom: 'Meta Lead Ads' },
    site_prefere: { nom: 'Showroom Casa Centre', ville: 'Casablanca' },
    __demo: true,
  },
  {
    id: 'demo-queue-2',
    nom: 'El Amrani',
    prenom: 'Fatima',
    telephone: '+212662987654',
    statut: 'nouveau',
    ville: 'Rabat',
    interet_produit: 'Berline Compacte',
    budget: 350000,
    nb_tentatives_appel: 0,
    created_at: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    source: { nom: 'Site Web Otoclic' },
    site_prefere: { nom: 'Showroom Rabat Agdal', ville: 'Rabat' },
    __demo: true,
  },
  {
    id: 'demo-queue-3',
    nom: 'Tazi',
    prenom: 'Mehdi',
    telephone: '+212663112233',
    statut: 'a_rappeler',
    ville: 'Casablanca',
    interet_produit: 'Électrique',
    budget: 420000,
    nb_tentatives_appel: 2,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    source: { nom: 'Google Ads' },
    site_prefere: { nom: 'Showroom Casa Centre', ville: 'Casablanca' },
    __demo: true,
  },
]

export default async function CallQueuePage() {
  let dispositions = DEMO_DISPOSITIONS
  let script = DEMO_SCRIPT
  let lead: QueueLead | null = DEMO_QUEUE[0]
  let reason = 'File de démonstration CRC'

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    const [{ data: dispositionsData }, { data: scriptsData }] = await Promise.all([
      supabase.from('call_dispositions').select('*').eq('actif', true).order('ordre', { ascending: true }),
      supabase.from('call_scripts').select('*').eq('actif', true).limit(1),
    ])

    if (dispositionsData && dispositionsData.length > 0) {
      dispositions = dispositionsData as Disposition[]
    }

    const contenu = scriptsData?.[0]?.contenu as Record<string, unknown> | undefined
    if (contenu) {
      script = contenu as unknown as ScriptContent
    }

    try {
      const next = await fetchNextLeadForAgent()
      lead = (next.lead as QueueLead | null) ?? null
      reason = next.reason
    } catch {
      lead = null
      reason = 'Impossible de charger la file d’appels'
    }
  }

  return (
    <CallQueueView
      initialLead={lead}
      initialReason={reason}
      dispositions={dispositions}
      script={script}
      demoQueue={DEMO_QUEUE}
    />
  )
}
