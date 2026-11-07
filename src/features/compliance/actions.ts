'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { normaliserTelephone } from '@/lib/utils'

// ------------------------------------------------------------
// Demandes de droits CNDP / RGPD
// ------------------------------------------------------------

export interface DataRequestInput {
  lead_id?: string | null
  type: 'acces' | 'rectification' | 'effacement' | 'opposition'
  demandeur_nom: string
  demandeur_contact: string
  motif?: string | null
}

export async function createDataRequest(data: DataRequestInput) {
  if (!data.demandeur_nom.trim() || !data.demandeur_contact.trim()) {
    return { success: false, error: 'Nom et contact du demandeur requis.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await (supabase.from('data_requests') as any).insert({
    lead_id: data.lead_id ?? null,
    type: data.type,
    statut: 'nouvelle',
    demandeur_nom: data.demandeur_nom.trim(),
    demandeur_contact: data.demandeur_contact.trim(),
    motif: data.motif?.trim() || null,
    traite_par: null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/conformite')
  return { success: true }
}

export async function updateDataRequest(
  id: string,
  statut: 'nouvelle' | 'en_cours' | 'traitee' | 'refusee',
  reponse?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await (supabase.from('data_requests') as any)
    .update({
      statut,
      reponse: reponse?.trim() || null,
      traite_par: user?.id ?? null,
      traite_le:
        statut === 'traitee' || statut === 'refusee'
          ? new Date().toISOString()
          : null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/conformite')
  return { success: true }
}

// ------------------------------------------------------------
// Anonymisation d'un lead (droit à l'effacement)
// ------------------------------------------------------------

export async function anonymizeLead(leadId: string, motif?: string) {
  if (!leadId) return { success: false, error: 'Lead requis.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase.rpc('anonymiser_lead', {
    p_lead_id: leadId,
  })

  if (error) return { success: false, error: error.message }

  await (supabase.from('data_requests') as any).insert({
    lead_id: null,
    type: 'effacement',
    statut: 'traitee',
    demandeur_nom: 'Anonymisation interne',
    demandeur_contact: user?.email ?? 'système',
    motif: motif ?? 'Droit à l’effacement appliqué depuis la console de conformité',
    reponse: 'Données personnelles anonymisées (nom, téléphone, email, notes).',
    traite_par: user?.id ?? null,
    traite_le: new Date().toISOString(),
  })

  revalidatePath('/conformite')
  revalidatePath('/leads')
  revalidatePath('/dashboard')
  return { success: Boolean(data ?? true) }
}

// ------------------------------------------------------------
// Liste « Ne pas appeler » (DNC)
// ------------------------------------------------------------

export async function addDncEntry(telephone: string, raison?: string) {
  const normalise = normaliserTelephone(telephone)

  if (!normalise || normalise.length < 9) {
    return { success: false, error: 'Numéro de téléphone invalide.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await (supabase.from('dnc_list') as any).insert({
    telephone: telephone.trim(),
    telephone_normalise: normalise,
    raison: raison?.trim() || 'Opposition au démarchage',
    ajoute_par: user?.id ?? null,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ce numéro est déjà dans la liste DNC.' }
    }
    return { success: false, error: error.message }
  }

  // Marquer les leads correspondants comme ne pas rappeler.
  await (supabase.from('leads') as any)
    .update({ statut: 'ne_pas_rappeler' })
    .or(`telephone_normalise.eq.${normalise},telephone.eq.${telephone.trim()}`)

  revalidatePath('/conformite')
  revalidatePath('/leads')
  return { success: true }
}

export async function removeDncEntry(telephone: string) {
  const supabase = await createClient()

  const { error } = await (supabase.from('dnc_list') as any)
    .delete()
    .eq('telephone', telephone)

  if (error) return { success: false, error: error.message }

  revalidatePath('/conformite')
  return { success: true }
}

// ------------------------------------------------------------
// Politique de rétention
// ------------------------------------------------------------

export interface RetentionPolicy {
  retention_leads_mois: number
  retention_appels_mois: number
  retenion_audit_mois: number
  responsable: string
}

export async function updateRetentionPolicy(policy: RetentionPolicy) {
  const supabase = await createClient()

  const { error } = await (supabase.from('integration_settings') as any).upsert(
    {
      cle: 'conformite',
      valeur: policy,
      actif: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'cle' }
  )

  if (error) return { success: false, error: error.message }

  revalidatePath('/conformite')
  return { success: true }
}