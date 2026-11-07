import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  DEMO_ROLE_COOKIE,
  getDemoProfile,
  type DemoProfile,
  type DemoRole,
} from '@/lib/demo-profile'

export interface CurrentProfile {
  id: string
  nom: string
  prenom?: string | null
  email: string
  role: DemoRole | string
  avatar_url?: string | null
  telephone?: string | null
  actif?: boolean
  team?: { nom: string; type?: string } | null
}

export interface ProfileContext {
  profile: CurrentProfile | null
  isDemo: boolean
  demoRole: DemoRole | null
}

export function isDemoMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return (
    !url ||
    !anon ||
    url.includes('placeholder') ||
    anon.includes('placeholder')
  )
}

export function readDemoProfile(): DemoProfile {
  const role = cookies().get(DEMO_ROLE_COOKIE)?.value
  return getDemoProfile(role)
}

export async function getCurrentProfile(): Promise<ProfileContext> {
  if (isDemoMode()) {
    const profile = readDemoProfile()
    return {
      profile,
      isDemo: true,
      demoRole: profile.role,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { profile: null, isDemo: false, demoRole: null }
  }

  const { data } = await supabase
    .from('profiles')
    .select('*, team:teams(nom, type)')
    .eq('id', user.id)
    .single()

  return {
    profile: (data as CurrentProfile | null) ?? null,
    isDemo: false,
    demoRole: null,
  }
}
