'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { taskCreateSchema } from '@/features/leads/schemas'

export async function createTask(data: any) {
  const parsed = taskCreateSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await (supabase.from('tasks_relances') as any).insert({
    lead_id: parsed.data.lead_id,
    type: parsed.data.type,
    echeance: parsed.data.echeance,
    notes: parsed.data.notes,
    assigne_a: parsed.data.assigne_a ?? user?.id,
    cree_par: user?.id,
    statut: 'en_attente',
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/taches')
  revalidatePath(`/leads/${parsed.data.lead_id}`)
  return { success: true }
}

export async function completeTask(taskId: string) {
  const supabase = await createClient()

  const { error } = await (supabase.from('tasks_relances') as any)
    .update({
      statut: 'terminee',
      termine_a: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/taches')
  return { success: true }
}

export async function rescheduleTask(taskId: string, newEcheance: string) {
  const supabase = await createClient()

  const { error } = await (supabase.from('tasks_relances') as any)
    .update({
      echeance: newEcheance,
    })
    .eq('id', taskId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/taches')
  return { success: true }
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()

  const { error } = await (supabase.from('tasks_relances') as any)
    .delete()
    .eq('id', taskId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/taches')
  return { success: true }
}



