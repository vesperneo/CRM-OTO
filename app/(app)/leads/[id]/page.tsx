import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Calendar,
  Building,
  User,
  Clock,
  DollarSign,
  Car,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { formatTelephone, formatMontant, formatTimeAgo, makeWhatsAppLink, isSupabaseConfigured } from '@/lib/utils'
import { LEAD_STATUSES, LEAD_SOURCES } from '@/lib/constants'
import LeadTimeline from '@/components/leads/LeadTimeline'
import LeadStatusChanger from '@/components/leads/LeadStatusChanger'
import LeadEditButton from '@/components/leads/LeadEditButton'

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string }
}) {
  let lead: any = null
  let activities: any[] | null = null
  let sources: { id: string; nom: string }[] = []
  let sites: { id: string; nom: string; ville: string }[] = []
  const configured = isSupabaseConfigured()

  if (configured) {
    const supabase = await createClient()

    const { data: leadData } = await supabase
      .from('leads')
      .select('*, source:sources(*), site_prefere:sites(*), assigne_crc:profiles!leads_assigne_crc_a_fkey(nom, prenom), assigne_commercial:profiles!leads_assigne_commercial_a_fkey(nom, prenom)')
      .eq('id', params.id)
      .single()
    lead = leadData

    const { data: activitiesData } = await supabase
      .from('activities')
      .select('*, auteur:profiles(nom, prenom)')
      .eq('lead_id', params.id)
      .order('created_at', { ascending: false })
    activities = activitiesData

    const [{ data: sourcesData }, { data: sitesData }] = await Promise.all([
      supabase.from('sources').select('id, nom').eq('actif', true),
      supabase.from('sites').select('id, nom, ville').eq('actif', true),
    ])
    sources = (sourcesData as { id: string; nom: string }[]) ?? []
    sites = (sitesData as { id: string; nom: string; ville: string }[]) ?? []
  }

  const sourceOptions = configured ? sources : LEAD_SOURCES

  // Fallback demo lead si DB locale non seedée
  const prospect = lead ?? {
    id: params.id,
    nom: 'Bennani',
    prenom: 'Youssef',
    telephone: '+212661234567',
    whatsapp: '+212661234567',
    email: 'youssef.bennani@gmail.com',
    ville: 'Casablanca',
    statut: 'en_qualification_crc',
    score: 80,
    budget: 350000,
    delai_achat: 'Moins de 1 mois',
    interet_produit: 'SUV Hybride 2025',
    reprise_vehicule: true,
    financement: true,
    notes: 'Client très motivé, souhaite voir le véhicule en showroom ce samedi.',
    nb_tentatives_appel: 1,
    site_prefere: { nom: 'Showroom Casa Centre', ville: 'Casablanca' },
    source: { nom: 'Facebook Ads' },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  }

  const activityList = activities && activities.length > 0 ? activities : [
    {
      id: 'act-1',
      type: 'appel',
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      contenu: {
        disposition: 'Répondu – Intéressé',
        duree: 214,
        notes: 'Discussion constructive sur la motorisation hybride et l’autonomie urbaine.',
      },
      auteur: { nom: 'Alami', prenom: 'Karim' },
    },
    {
      id: 'act-2',
      type: 'changement_statut',
      created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      contenu: {
        ancien_statut: 'nouveau',
        nouveau_statut: 'en_qualification_crc',
      },
      auteur: { nom: 'Alami', prenom: 'Karim' },
    },
  ]

  const statusObj = LEAD_STATUSES.find(s => s.value === prospect.statut)

  return (
    <div className="space-y-6">
      {/* Top back & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la liste des leads
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={`tel:${prospect.telephone}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            Appeler ({formatTelephone(prospect.telephone)})
          </a>
          <a
            href={makeWhatsAppLink(prospect.telephone, `Bonjour M. ${prospect.nom}, je fais suite à votre demande sur Otoclic.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
          <Link
            href={`/crc/file`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            Session d'appel CRC
          </Link>
          <LeadEditButton lead={prospect} sources={sourceOptions} sites={sites} />
        </div>
      </div>

      {/* Prospect Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {prospect.prenom} {prospect.nom}
              </h2>
              <LeadStatusChanger leadId={prospect.id} currentStatus={prospect.statut} />
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                Score : {prospect.score} / 100
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Créé {formatTimeAgo(prospect.created_at)} • Source : {prospect.source?.nom ?? 'Direct'} • Ville : {prospect.ville ?? 'Non renseignée'}
            </p>
          </div>
        </div>

        {/* Détails qualification */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 font-medium block">Intérêt modèle</span>
            <span className="font-semibold text-gray-900 mt-1 block text-sm">{prospect.interet_produit ?? 'Non précisé'}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 font-medium block">Budget</span>
            <span className="font-semibold text-gray-900 mt-1 block text-sm">{formatMontant(prospect.budget)}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 font-medium block">Délai d'achat</span>
            <span className="font-semibold text-gray-900 mt-1 block text-sm">{prospect.delai_achat ?? 'Non qualifié'}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-gray-400 font-medium block">Financement / Reprise</span>
            <span className="font-semibold text-gray-900 mt-1 block text-sm">
              {prospect.financement ? 'Crédit/LOA' : 'Comptant'} • {prospect.reprise_vehicule ? 'Avec reprise' : 'Sans reprise'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 2 columns Timeline & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LeadTimeline leadId={prospect.id} activities={activityList} />
        </div>

        <div className="space-y-6">
          {/* Fiche coordonnées */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3 text-xs">
            <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Informations de contact</h4>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Téléphone</span>
              <span className="font-mono font-medium text-gray-900">{formatTelephone(prospect.telephone)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-900">{prospect.email ?? '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Showroom préféré</span>
              <span className="font-medium text-gray-900">{prospect.site_prefere?.nom ?? 'Casablanca'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500">Tentatives d'appel CRC</span>
              <span className="font-medium text-gray-900">{prospect.nb_tentatives_appel ?? 0}</span>
            </div>
          </div>

          {/* Notes du prospect */}
          {prospect.notes && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-xs space-y-2">
              <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Remarques initiales</h4>
              <p className="text-gray-600 italic">{prospect.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

