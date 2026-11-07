export const DEMO_ROLE_COOKIE = 'otoclic_demo_role'

export type DemoRole =
  | 'admin'
  | 'superviseur_crc'
  | 'agent_crc'
  | 'responsable_site'
  | 'commercial'

export interface DemoProfile {
  id: string
  nom: string
  prenom: string
  email: string
  role: DemoRole
  avatar_url: null
  telephone: string
  team: { nom: string; type: string }
}

export const DEMO_PROFILES: Record<DemoRole, DemoProfile> = {
  admin: {
    id: '00000000-0000-0000-0000-000000000001',
    nom: 'Alami',
    prenom: 'Karim',
    email: 'karim.alami@otoclic.ma',
    role: 'admin',
    avatar_url: null,
    telephone: '+212661000001',
    team: { nom: 'Direction Otoclic', type: 'autre' },
  },
  superviseur_crc: {
    id: '00000000-0000-0000-0000-000000000002',
    nom: 'Mansouri',
    prenom: 'Sara',
    email: 'sara.mansouri@otoclic.ma',
    role: 'superviseur_crc',
    avatar_url: null,
    telephone: '+212661000002',
    team: { nom: 'CRC Central Casablanca', type: 'crc' },
  },
  agent_crc: {
    id: '00000000-0000-0000-0000-000000000003',
    nom: 'Berrada',
    prenom: 'Yassine',
    email: 'yassine.berrada@otoclic.ma',
    role: 'agent_crc',
    avatar_url: null,
    telephone: '+212661000003',
    team: { nom: 'CRC Central Casablanca', type: 'crc' },
  },
  responsable_site: {
    id: '00000000-0000-0000-0000-000000000004',
    nom: 'El Fassi',
    prenom: 'Hind',
    email: 'hind.elfassi@otoclic.ma',
    role: 'responsable_site',
    avatar_url: null,
    telephone: '+212661000004',
    team: { nom: 'Showroom Casa Centre', type: 'showroom' },
  },
  commercial: {
    id: '00000000-0000-0000-0000-000000000005',
    nom: 'Tazi',
    prenom: 'Reda',
    email: 'reda.tazi@otoclic.ma',
    role: 'commercial',
    avatar_url: null,
    telephone: '+212661000005',
    team: { nom: 'Showroom Casa Centre', type: 'showroom' },
  },
}

export const DEMO_ROLE_LABELS: Record<DemoRole, string> = {
  admin: 'Administrateur',
  superviseur_crc: 'Superviseur CRC',
  agent_crc: 'Agent CRC',
  responsable_site: 'Responsable de site',
  commercial: 'Commercial',
}

export const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  superviseur_crc: '/superviseur',
  agent_crc: '/agent',
  responsable_site: '/dashboard',
  commercial: '/dashboard',
}

export function isDemoRole(value: string | undefined | null): value is DemoRole {
  return Boolean(value && value in DEMO_PROFILES)
}

export function getDemoProfile(role: string | undefined | null): DemoProfile {
  return isDemoRole(role) ? DEMO_PROFILES[role] : DEMO_PROFILES.admin
}

export function getRoleHome(role: string | undefined | null): string {
  return ROLE_HOME[role ?? ''] ?? '/dashboard'
}
