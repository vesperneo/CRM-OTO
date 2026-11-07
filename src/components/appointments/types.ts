export interface AppointmentItem {
  id: string
  lead_id: string
  site_id?: string | null
  assigne_a_id?: string | null
  pris_par_id?: string | null
  debut: string
  fin: string
  type: string
  statut: string
  confirme_par_crc_le?: string | null
  rappel_j1_envoye?: boolean | null
  rappel_h2_envoye?: boolean | null
  token_public?: string
  google_event_id?: string | null
  notes_crc?: string | null
  notes_commercial?: string | null
  lead?: {
    id?: string
    nom: string
    prenom?: string | null
    telephone: string
    email?: string | null
  } | null
  site?: {
    id?: string
    nom: string
    ville?: string | null
    adresse?: string | null
  } | null
  assigne_a?: { nom: string; prenom?: string | null } | null
  pris_par?: { nom: string; prenom?: string | null } | null
  __demo?: boolean
}

export interface SiteOption {
  id: string
  nom: string
  ville?: string | null
}

export interface LeadOption {
  id: string
  nom: string
  prenom?: string | null
  telephone: string
  site_prefere_id?: string | null
}

export interface ProfileOption {
  id: string
  nom: string
  prenom?: string | null
  role?: string
}

export const SITE_COLORS = [
  { bg: 'bg-brand-500', soft: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', hex: '#da3655' },
  { bg: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', hex: '#10b981' },
  { bg: 'bg-violet-500', soft: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', hex: '#8b5cf6' },
  { bg: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', hex: '#f59e0b' },
  { bg: 'bg-rose-500', soft: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', hex: '#f43f5e' },
  { bg: 'bg-cyan-500', soft: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', hex: '#06b6d4' },
]

export function getSiteColor(siteId: string | null | undefined, sites: SiteOption[]) {
  const index = Math.max(
    0,
    sites.findIndex((s) => s.id === siteId)
  )
  return SITE_COLORS[index % SITE_COLORS.length]
}

export function getProspectNom(appointment: AppointmentItem): string {
  if (!appointment.lead) return 'Prospect non lié'
  return [appointment.lead.prenom, appointment.lead.nom].filter(Boolean).join(' ')
}