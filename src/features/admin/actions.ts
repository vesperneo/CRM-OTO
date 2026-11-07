'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/constants'

const VALID_ROLES = ROLES.map((r) => r.value) as string[]
const VALID_TEAM_TYPES = ['crc', 'showroom', 'autre']
const VALID_DISPOSITION_ACTIONS = [
  'creer_relance',
  'changer_statut',
  'creer_rdv',
  'cloturer',
  'envoyer_whatsapp',
  'envoyer_email',
  'marquer_dnc',
  'rien',
]

async function ensureAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, error: 'Non authentifié.' as string }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return {
      supabase,
      user: null,
      error: 'Accès réservé aux administrateurs.',
    }
  }

  return { supabase, user, error: null }
}

function revalidateAdmin() {
  revalidatePath('/admin')
  revalidatePath('/parametres')
}

// ------------------------------------------------------------
// Utilisateurs
// ------------------------------------------------------------
export async function updateUserProfile(
  userId: string,
  patch: {
    role?: string
    team_id?: string | null
    actif?: boolean
    nom?: string
    prenom?: string | null
    telephone?: string | null
  }
) {
  const { supabase, user, error } = await ensureAdmin()
  if (error || !supabase || !user) return { success: false, error }

  const payload: Record<string, unknown> = {}
  if (patch.role !== undefined) {
    if (!VALID_ROLES.includes(patch.role)) {
      return { success: false, error: 'Rôle invalide.' }
    }
    if (userId === user.id && patch.role !== 'admin') {
      return {
        success: false,
        error: 'Vous ne pouvez pas retirer votre propre rôle administrateur.',
      }
    }
    payload.role = patch.role
  }
  if (patch.team_id !== undefined) payload.team_id = patch.team_id || null
  if (patch.actif !== undefined) {
    if (userId === user.id && !patch.actif) {
      return { success: false, error: 'Vous ne pouvez pas désactiver votre compte.' }
    }
    payload.actif = patch.actif
  }
  if (patch.nom !== undefined) payload.nom = patch.nom
  if (patch.prenom !== undefined) payload.prenom = patch.prenom || null
  if (patch.telephone !== undefined) payload.telephone = patch.telephone || null

  if (Object.keys(payload).length === 0) {
    return { success: false, error: 'Aucune modification fournie.' }
  }

  const { error: updateError } = await (supabase.from('profiles') as any)
    .update(payload)
    .eq('id', userId)

  if (updateError) return { success: false, error: updateError.message }

  revalidateAdmin()
  revalidatePath('/crc/supervision')
  return { success: true }
}

export async function inviterUtilisateur(input: {
  email: string
  nom: string
  prenom?: string
  role: string
  team_id?: string | null
}) {
  const { supabase, user, error } = await ensureAdmin()
  if (error || !supabase || !user) return { success: false, error }

  const email = input.email.trim().toLowerCase()
  if (!email.includes('@')) return { success: false, error: 'Email invalide.' }
  if (!input.nom.trim()) return { success: false, error: 'Le nom est requis.' }
  if (!VALID_ROLES.includes(input.role)) {
    return { success: false, error: 'Rôle invalide.' }
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      success: false,
      error:
        'SUPABASE_SERVICE_ROLE_KEY est requis pour envoyer une invitation.',
    }
  }

  const admin = await createAdminClient()
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { nom: input.nom, prenom: input.prenom ?? '' },
    }
  )

  if (inviteError || !invited.user) {
    return {
      success: false,
      error: inviteError?.message ?? "Invitation impossible.",
    }
  }

  const { error: profileError } = await (admin.from('profiles') as any)
    .update({
      nom: input.nom,
      prenom: input.prenom || null,
      role: input.role,
      team_id: input.team_id || null,
      actif: true,
    })
    .eq('id', invited.user.id)

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  revalidateAdmin()
  return { success: true }
}

// ------------------------------------------------------------
// Équipes
// ------------------------------------------------------------
export async function saveTeam(input: {
  id?: string
  nom: string
  type: string
  actif?: boolean
}) {
  const { supabase, error } = await ensureAdmin()
  if (error || !supabase) return { success: false, error }

  if (!input.nom.trim()) return { success: false, error: "Le nom de l'équipe est requis." }
  if (!VALID_TEAM_TYPES.includes(input.type)) {
    return { success: false, error: "Type d'équipe invalide." }
  }

  if (input.id) {
    const { error: updateError } = await (supabase.from('teams') as any)
      .update({ nom: input.nom.trim(), type: input.type, actif: input.actif ?? true })
      .eq('id', input.id)
    if (updateError) return { success: false, error: updateError.message }
  } else {
    const { error: insertError } = await (supabase.from('teams') as any).insert({
      nom: input.nom.trim(),
      type: input.type,
      actif: input.actif ?? true,
    })
    if (insertError) return { success: false, error: insertError.message }
  }

  revalidateAdmin()
  return { success: true }
}

// ------------------------------------------------------------
// Sites
// ------------------------------------------------------------
export async function saveSite(input: {
  id?: string
  nom: string
  ville: string
  adresse?: string | null
  telephone?: string | null
  email?: string | null
  actif?: boolean
}) {
  const { supabase, error } = await ensureAdmin()
  if (error || !supabase) return { success: false, error }

  if (!input.nom.trim()) return { success: false, error: 'Le nom du site est requis.' }
  if (!input.ville.trim()) return { success: false, error: 'La ville est requise.' }

  const payload = {
    nom: input.nom.trim(),
    ville: input.ville.trim(),
    adresse: input.adresse || null,
    telephone: input.telephone || null,
    email: input.email || null,
    actif: input.actif ?? true,
  }

  if (input.id) {
    const { error: updateError } = await (supabase.from('sites') as any)
      .update(payload)
      .eq('id', input.id)
    if (updateError) return { success: false, error: updateError.message }
  } else {
    const { error: insertError } = await (supabase.from('sites') as any).insert(payload)
    if (insertError) return { success: false, error: insertError.message }
  }

  revalidateAdmin()
  revalidatePath('/rendez-vous')
  return { success: true }
}

// ------------------------------------------------------------
// Dispositions d'appel
// ------------------------------------------------------------
export async function saveDisposition(input: {
  id?: string
  libelle: string
  type: string
  action: string
  couleur: string
  ordre: number
  actif?: boolean
}) {
  const { supabase, error } = await ensureAdmin()
  if (error || !supabase) return { success: false, error }

  if (!input.libelle.trim()) {
    return { success: false, error: 'Le libellé est requis.' }
  }
  if (!VALID_DISPOSITION_ACTIONS.includes(input.action)) {
    return { success: false, error: 'Action invalide.' }
  }

  const payload = {
    libelle: input.libelle.trim(),
    type: input.type.trim() || 'autre',
    action: input.action,
    couleur: input.couleur || '#6B7280',
    ordre: Number.isFinite(input.ordre) ? input.ordre : 0,
    actif: input.actif ?? true,
  }

  if (input.id) {
    const { error: updateError } = await (supabase.from('call_dispositions') as any)
      .update(payload)
      .eq('id', input.id)
    if (updateError) return { success: false, error: updateError.message }
  } else {
    const { error: insertError } = await (supabase.from('call_dispositions') as any).insert(
      payload
    )
    if (insertError) return { success: false, error: insertError.message }
  }

  revalidateAdmin()
  revalidatePath('/crc/file')
  return { success: true }
}
