'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const CLOSED_STATUSES = '("gagne","perdu","ne_pas_rappeler","doublon")'

// ------------------------------------------------------------
// Escalade manuelle d'un lead (SLA dépassé)
// ------------------------------------------------------------
export async function escalateLead(leadId: string, motif?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: lead } = await (supabase.from('leads') as any)
    .select('id, statut, assigne_crc_a')
    .eq('id', leadId)
    .single()

  if (!lead) return { success: false, error: 'Lead introuvable' }

  const { error } = await (supabase.from('leads') as any)
    .update({
      priorite: 2,
      escalade_le: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) return { success: false, error: error.message }

  await (supabase.from('activities') as any).insert({
    lead_id: leadId,
    type: 'systeme',
    contenu: {
      action: 'escalade_manuelle',
      texte: motif ?? 'Lead escaladé au superviseur CRC',
    },
    auteur_id: user?.id ?? null,
  })

  await (supabase.from('tasks_relances') as any).insert({
    lead_id: leadId,
    assigne_a: lead.assigne_crc_a ?? user?.id ?? null,
    type: 'rappel_appel',
    echeance: new Date().toISOString(),
    statut: 'en_attente',
    notes: motif ?? 'Escalade superviseur — appel prioritaire',
    regle_origine: 'sla_escalade_manuelle',
  })

  revalidatePath('/crc/supervision')
  revalidatePath('/dashboard')
  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
  return { success: true }
}

// ------------------------------------------------------------
// Réassignation d'un lead à un agent CRC
// ------------------------------------------------------------
export async function reassignLead(leadId: string, agentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await (supabase.from('leads') as any)
    .update({
      assigne_crc_a: agentId,
      verrouille_par: null,
      verrouille_jusqu_a: null,
      priorite: 1,
    })
    .eq('id', leadId)

  if (error) return { success: false, error: error.message }

  await (supabase.from('activities') as any).insert({
    lead_id: leadId,
    type: 'transfert',
    contenu: {
      action: 'reassignation_crc',
      assigne_a: agentId,
    },
    auteur_id: user?.id ?? null,
  })

  revalidatePath('/crc/supervision')
  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
  return { success: true }
}

export async function bulkReassignLeads(leadIds: string[], agentId: string) {
  if (leadIds.length === 0) {
    return { success: false, error: 'Aucun lead sélectionné' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await (supabase.from('leads') as any)
    .update({
      assigne_crc_a: agentId,
      verrouille_par: null,
      verrouille_jusqu_a: null,
      priorite: 1,
    })
    .in('id', leadIds)

  if (error) return { success: false, error: error.message }

  await (supabase.from('activities') as any).insert(
    leadIds.map((id) => ({
      lead_id: id,
      type: 'transfert',
      contenu: { action: 'reassignation_masse', assigne_a: agentId },
      auteur_id: user?.id ?? null,
    }))
  )

  revalidatePath('/crc/supervision')
  revalidatePath('/leads')
  return { success: true, reassigned: leadIds.length }
}

// ------------------------------------------------------------
// Round-robin : répartit les leads non assignés sur les agents actifs
// ------------------------------------------------------------
export async function roundRobinAssignLeads(limit = 25) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agents } = await (supabase.from('profiles') as any)
    .select('id, nom, prenom')
    .eq('role', 'agent_crc')
    .eq('actif', true)

  if (!agents || agents.length === 0) {
    return { success: false, error: 'Aucun agent CRC actif disponible' }
  }

  const loads = await Promise.all(
    (agents as { id: string }[]).map(async (agent) => {
      const { count } = await (supabase.from('leads') as any)
        .select('*', { count: 'exact', head: true })
        .eq('assigne_crc_a', agent.id)
        .not('statut', 'in', CLOSED_STATUSES)
      return { id: agent.id, load: count ?? 0 }
    })
  )

  const { data: leads } = await (supabase.from('leads') as any)
    .select('id')
    .is('assigne_crc_a', null)
    .not('statut', 'in', CLOSED_STATUSES)
    .order('priorite', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)

  if (!leads || leads.length === 0) {
    return { success: true, assigned: 0, message: 'Aucun lead non assigné' }
  }

  for (const lead of leads as { id: string }[]) {
    loads.sort((a, b) => a.load - b.load)
    const target = loads[0]

    await (supabase.from('leads') as any)
      .update({ assigne_crc_a: target.id })
      .eq('id', lead.id)

    await (supabase.from('activities') as any).insert({
      lead_id: lead.id,
      type: 'transfert',
      contenu: { action: 'round_robin', assigne_a: target.id },
      auteur_id: user?.id ?? null,
    })

    target.load += 1
  }

  revalidatePath('/crc/supervision')
  revalidatePath('/leads')
  revalidatePath('/dashboard')

  return { success: true, assigned: leads.length }
}