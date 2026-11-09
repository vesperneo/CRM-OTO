import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export interface CurrentProfile {
  id: string
  nom: string
  prenom?: string | null
  email: string
  role: string
  avatar_url?: string | null
  telephone?: string | null
  actif?: boolean
  team?: { nom: string; type?: string } | null
}

export interface ProfileContext {
  profile: CurrentProfile | null
}

export async function getCurrentProfile(): Promise<ProfileContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { profile: null }
  }

  const { data } = await supabase
    .from('profiles')
    .select('*, team:teams(nom, type)')
    .eq('id', user.id)
    .single()

  return {
    profile: (data as CurrentProfile | null) ?? null,
  }
}

export const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  superviseur_crc: '/superviseur',
  agent_crc: '/agent',
  responsable_site: '/dashboard',
  commercial: '/dashboard',
}

export function getRoleHome(role: string | undefined | null): string {
  return ROLE_HOME[role ?? ''] ?? '/dashboard'
}
