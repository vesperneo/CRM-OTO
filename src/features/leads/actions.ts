'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { leadCreateSchema, leadUpdateSchema, LeadCreateInput, LeadUpdateInput } from './schemas'
import { normaliserTelephone, calculerScoreLead } from '@/lib/utils'

export async function createLead(data: LeadCreateInput) {
  const parsed = leadCreateSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const telNorm = normaliserTelephone(parsed.data.telephone)

  // Vérifier doublon éventuel
  const { data: existing } = await (supabase.from('leads') as any)
    .select('id, nom, prenom, statut')
    .eq('telephone_normalise', telNorm)
    .not('statut', 'in', '("doublon","ne_pas_rappeler")')
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      error: `Ce numéro existe déjà pour le lead ${existing.prenom ?? ''} ${existing.nom} (Statut: ${existing.statut})`,
      duplicateLeadId: existing.id,
    }
  }

  const score = calculerScoreLead({
    budget: parsed.data.budget,
    consentement_contact: parsed.data.consentement_contact,
    financement: parsed.data.financement,
    delai_achat: parsed.data.delai_achat,
  })

  const { data: lead, error } = await (supabase.from('leads') as any)
    .insert({
      ...parsed.data,
      telephone_normalise: telNorm,
      statut: 'nouveau',
      score,
      created_by: user?.id ?? null,
      assigne_crc_a: user?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Journaliser dans activities
  if (lead) {
    await (supabase.from('activities') as any).insert({
      lead_id: lead.id,
      type: 'systeme',
      contenu: {
        action: 'creation',
        source: parsed.data.source_id,
        texte: 'Lead créé manuellement dans le CRM',
      },
      auteur_id: user?.id ?? null,
    })
  }

  revalidatePath('/leads')
  revalidatePath('/dashboard')
  revalidatePath('/crc/file')
  return { success: true, lead }
}

export async function updateLead(data: LeadUpdateInput) {
  const parsed = leadUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const supabase = await createClient()
  const { id, ...updateFields } = parsed.data

  const { data: lead, error } = await (supabase.from('leads') as any)
    .update(updateFields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/leads/${id}`)
  revalidatePath('/leads')
  revalidatePath('/leads/kanban')
  return { success: true, lead }
}

export async function updateLeadStatus(leadId: string, newStatus: string, perduRaison?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: oldLead } = await (supabase.from('leads') as any)
    .select('statut')
    .eq('id', leadId)
    .single()

  const updateData: any = { statut: newStatus }
  if (newStatus === 'perdu' && perduRaison) {
    updateData.perdu_raison = perduRaison
  }

  const { error } = await (supabase.from('leads') as any)
    .update(updateData)
    .eq('id', leadId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Activity log
  await (supabase.from('activities') as any).insert({
    lead_id: leadId,
    type: 'changement_statut',
    contenu: {
      ancien_statut: oldLead?.statut,
      nouveau_statut: newStatus,
      raison: perduRaison,
    },
    auteur_id: user?.id ?? null,
  })

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  revalidatePath('/leads/kanban')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function addLeadNote(leadId: string, texte: string) {
  if (!texte.trim()) return { success: false, error: 'Note vide' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await (supabase.from('activities') as any).insert({
    lead_id: leadId,
    type: 'note',
    contenu: { texte },
    auteur_id: user?.id ?? null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/leads/${leadId}`)
  return { success: true }
}

// Verrouillage du lead pour l'agent (30 min)
export async function lockLeadForAgent(leadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  // Vérifier si déjà verrouillé par un autre agent
  const { data: current } = await (supabase.from('leads') as any)
    .select('verrouille_par, verrouille_jusqu_a')
    .eq('id', leadId)
    .single()

  if (
    current?.verrouille_par &&
    current.verrouille_par !== user.id &&
    current.verrouille_jusqu_a &&
    new Date(current.verrouille_jusqu_a) > new Date()
  ) {
    return {
      success: false,
      error: 'Ce lead est actuellement en cours d’appel par un autre agent CRC.',
    }
  }

  const { error } = await (supabase.from('leads') as any)
    .update({
      verrouille_par: user.id,
      verrouille_jusqu_a: lockUntil,
    })
    .eq('id', leadId)

  if (error) return { success: false, error: error.message }

  return { success: true, lockedUntil: lockUntil }
}

export async function unlockLead(leadId: string) {
  const supabase = await createClient()
  await (supabase.from('leads') as any)
    .update({
      verrouille_par: null,
      verrouille_jusqu_a: null,
    })
    .eq('id', leadId)

  return { success: true }
}

// Import par lot avec détection de doublons
export async function importLeadsBatch(leadsList: LeadCreateInput[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let imported = 0
  let duplicates = 0
  let errors = 0

  for (const item of leadsList) {
    const telNorm = normaliserTelephone(item.telephone)
    if (!telNorm || telNorm.length < 9) {
      errors++
      continue
    }

    // Doublon check
    const { data: existing } = await (supabase.from('leads') as any)
      .select('id')
      .eq('telephone_normalise', telNorm)
      .maybeSingle()

    if (existing) {
      duplicates++
      continue
    }

    const score = calculerScoreLead(item)
    const { error } = await (supabase.from('leads') as any).insert({
      ...item,
      telephone_normalise: telNorm,
      statut: 'nouveau',
      score,
      created_by: user?.id ?? null,
    })

    if (error) {
      errors++
    } else {
      imported++
    }
  }

  revalidatePath('/leads')
  revalidatePath('/dashboard')
  return {
    success: true,
    result: { imported, duplicates, errors, total: leadsList.length },
  }
}

// Suppression complète d'un lead (Admin & Superviseur)
export async function deleteLead(leadId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Non authentifié.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const canDelete =
    profile?.role === 'admin' || profile?.role === 'superviseur_crc'

  if (!canDelete) {
    return {
      success: false,
      error: 'Privilèges insuffisants. Seul un administrateur peut supprimer un lead.',
    }
  }

  // Supprimer les enregistrements liés explicitement par précaution
  await (supabase.from('activities') as any).delete().eq('lead_id', leadId)
  await (supabase.from('appointments') as any).delete().eq('lead_id', leadId)
  await (supabase.from('calls') as any).delete().eq('lead_id', leadId)
  await (supabase.from('qualification_answers') as any).delete().eq('lead_id', leadId)
  await (supabase.from('tasks_relances') as any).delete().eq('lead_id', leadId)
  await (supabase.from('lead_tags') as any).delete().eq('lead_id', leadId)

  const { error } = await (supabase.from('leads') as any)
    .delete()
    .eq('id', leadId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/leads')
  revalidatePath('/leads/kanban')
  revalidatePath('/dashboard')
  revalidatePath('/crc/file')
  return { success: true }
}

