import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/profile'
import { getRoleHome } from '@/lib/demo-profile'
import AdminView from '@/components/admin/AdminView'
import type {
  AdminAuditEntry,
  AdminDisposition,
  AdminSite,
  AdminTeam,
  AdminUser,
} from '@/components/admin/types'

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

const DEMO_USERS: AdminUser[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    nom: 'Alami',
    prenom: 'Karim',
    email: 'karim.alami@otoclic.ma',
    role: 'admin',
    team_id: 'demo-team-0',
    team_nom: 'Direction Otoclic',
    telephone: '+212661000001',
    actif: true,
    created_at: minutesAgo(60 * 24 * 210),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    nom: 'Mansouri',
    prenom: 'Sara',
    email: 'sara.mansouri@otoclic.ma',
    role: 'superviseur_crc',
    team_id: 'demo-team-1',
    team_nom: 'CRC Central Casablanca',
    telephone: '+212661000002',
    actif: true,
    created_at: minutesAgo(60 * 24 * 180),
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    nom: 'Berrada',
    prenom: 'Yassine',
    email: 'yassine.berrada@otoclic.ma',
    role: 'agent_crc',
    team_id: 'demo-team-1',
    team_nom: 'CRC Central Casablanca',
    telephone: '+212661000003',
    actif: true,
    created_at: minutesAgo(60 * 24 * 120),
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    nom: 'Bennis',
    prenom: 'Amina',
    email: 'amina.bennis@otoclic.ma',
    role: 'agent_crc',
    team_id: 'demo-team-1',
    team_nom: 'CRC Central Casablanca',
    telephone: '+212661000006',
    actif: true,
    created_at: minutesAgo(60 * 24 * 96),
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    nom: 'Chraibi',
    prenom: 'Omar',
    email: 'omar.chraibi@otoclic.ma',
    role: 'agent_crc',
    team_id: 'demo-team-1',
    team_nom: 'CRC Central Casablanca',
    telephone: '+212661000007',
    actif: true,
    created_at: minutesAgo(60 * 24 * 75),
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    nom: 'El Fassi',
    prenom: 'Hind',
    email: 'hind.elfassi@otoclic.ma',
    role: 'responsable_site',
    team_id: 'demo-team-2',
    team_nom: 'Showroom Casa Centre',
    telephone: '+212661000004',
    actif: true,
    created_at: minutesAgo(60 * 24 * 150),
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    nom: 'Tazi',
    prenom: 'Reda',
    email: 'reda.tazi@otoclic.ma',
    role: 'commercial',
    team_id: 'demo-team-2',
    team_nom: 'Showroom Casa Centre',
    telephone: '+212661000005',
    actif: true,
    created_at: minutesAgo(60 * 24 * 88),
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    nom: 'Idrissi',
    prenom: 'Salma',
    email: 'salma.idrissi@otoclic.ma',
    role: 'commercial',
    team_id: 'demo-team-3',
    team_nom: 'Showroom Rabat Agdal',
    telephone: '+212661000008',
    actif: true,
    created_at: minutesAgo(60 * 24 * 64),
  },
  {
    id: '00000000-0000-0000-0000-000000000009',
    nom: 'Lahlou',
    prenom: 'Mehdi',
    email: 'mehdi.lahlou@otoclic.ma',
    role: 'lecture_seule',
    team_id: null,
    team_nom: null,
    telephone: null,
    actif: false,
    created_at: minutesAgo(60 * 24 * 40),
  },
]

const DEMO_TEAMS: AdminTeam[] = [
  { id: 'demo-team-0', nom: 'Direction Otoclic', type: 'autre', actif: true, membres: 1 },
  { id: 'demo-team-1', nom: 'CRC Central Casablanca', type: 'crc', actif: true, membres: 4 },
  { id: 'demo-team-2', nom: 'Showroom Casa Centre', type: 'showroom', actif: true, membres: 2 },
  { id: 'demo-team-3', nom: 'Showroom Rabat Agdal', type: 'showroom', actif: true, membres: 1 },
  { id: 'demo-team-4', nom: 'Showroom Marrakech', type: 'showroom', actif: false, membres: 0 },
]

const DEMO_SITES: AdminSite[] = [
  {
    id: 'demo-site-1',
    nom: 'Showroom Casa Centre',
    ville: 'Casablanca',
    adresse: '123 Bd Zerktouni',
    telephone: '+212522001122',
    email: 'casa@otoclic.ma',
    actif: true,
    commerciaux: 2,
  },
  {
    id: 'demo-site-2',
    nom: 'Showroom Rabat Agdal',
    ville: 'Rabat',
    adresse: '45 Av. Fal Ould Oumeir',
    telephone: '+212537001122',
    email: 'rabat@otoclic.ma',
    actif: true,
    commerciaux: 1,
  },
  {
    id: 'demo-site-3',
    nom: 'Showroom Marrakech',
    ville: 'Marrakech',
    adresse: '12 Av. Mohammed VI',
    telephone: '+212524001122',
    email: 'marrakech@otoclic.ma',
    actif: true,
    commerciaux: 0,
  },
]

const DEMO_DISPOSITIONS: AdminDisposition[] = [
  { id: 'disp-1', libelle: 'Répondu — Intéressé', type: 'repond_interesse', action: 'creer_relance', couleur: '#10B981', ordre: 1, actif: true },
  { id: 'disp-2', libelle: 'Répondu — À rappeler', type: 'repond_rappeler', action: 'creer_relance', couleur: '#F59E0B', ordre: 2, actif: true },
  { id: 'disp-3', libelle: 'Répondu — Pas intéressé', type: 'repond_pas_interesse', action: 'changer_statut', couleur: '#EF4444', ordre: 3, actif: true },
  { id: 'disp-4', libelle: 'Pas de réponse', type: 'pas_reponse', action: 'creer_relance', couleur: '#6B7280', ordre: 4, actif: true },
  { id: 'disp-5', libelle: 'Messagerie', type: 'messagerie', action: 'envoyer_whatsapp', couleur: '#8B5CF6', ordre: 5, actif: true },
  { id: 'disp-6', libelle: 'Occupé', type: 'occupe', action: 'creer_relance', couleur: '#6B7280', ordre: 6, actif: true },
  { id: 'disp-7', libelle: 'Numéro erroné / Hors service', type: 'numero_errone', action: 'envoyer_whatsapp', couleur: '#DC2626', ordre: 7, actif: true },
  { id: 'disp-8', libelle: 'RDV pris', type: 'rdv_pris', action: 'creer_rdv', couleur: '#da3655', ordre: 8, actif: true },
  { id: 'disp-9', libelle: 'Doublon', type: 'doublon', action: 'changer_statut', couleur: '#8B5CF6', ordre: 9, actif: false },
  { id: 'disp-10', libelle: 'Ne pas rappeler (DNC)', type: 'dnc', action: 'marquer_dnc', couleur: '#111827', ordre: 10, actif: true },
]

const DEMO_AUDIT: AdminAuditEntry[] = [
  { id: 10, table_name: 'leads', operation: 'UPDATE', created_at: minutesAgo(4), auteur: { nom: 'Berrada', prenom: 'Yassine' } },
  { id: 9, table_name: 'appointments', operation: 'INSERT', created_at: minutesAgo(18), auteur: { nom: 'Mansouri', prenom: 'Sara' } },
  { id: 8, table_name: 'leads', operation: 'UPDATE', created_at: minutesAgo(33), auteur: { nom: 'Bennis', prenom: 'Amina' } },
  { id: 7, table_name: 'leads', operation: 'INSERT', created_at: minutesAgo(51), auteur: { nom: 'Chraibi', prenom: 'Omar' } },
  { id: 6, table_name: 'appointments', operation: 'UPDATE', created_at: minutesAgo(76), auteur: { nom: 'El Fassi', prenom: 'Hind' } },
  { id: 5, table_name: 'leads', operation: 'DELETE', created_at: minutesAgo(122), auteur: { nom: 'Alami', prenom: 'Karim' } },
  { id: 4, table_name: 'leads', operation: 'UPDATE', created_at: minutesAgo(170), auteur: { nom: 'Tazi', prenom: 'Reda' } },
  { id: 3, table_name: 'appointments', operation: 'INSERT', created_at: minutesAgo(240), auteur: { nom: 'Mansouri', prenom: 'Sara' } },
]

const DEMO_STATS = {
  totalUsers: 9,
  activeUsers: 8,
  totalLeads: 1284,
  leadsThisMonth: 186,
  upcomingAppointments: 42,
  gagnes: 96,
  conversion: 7.5,
  callsToday: 318,
}

export default async function AdminPage() {
  const { profile, isDemo } = await getCurrentProfile()

  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect(getRoleHome(profile.role))

  if (isDemo) {
    return (
      <AdminView
        users={DEMO_USERS}
        teams={DEMO_TEAMS}
        sites={DEMO_SITES}
        dispositions={DEMO_DISPOSITIONS}
        audit={DEMO_AUDIT}
        stats={DEMO_STATS}
        isDemo
      />
    )
  }

  const supabase = await createClient()
  let users: AdminUser[] = []
  let teams: AdminTeam[] = []
  let sites: AdminSite[] = []
  let dispositions: AdminDisposition[] = []
  let audit: AdminAuditEntry[] = []
  let stats = {
    totalUsers: 0,
    activeUsers: 0,
    totalLeads: 0,
    leadsThisMonth: 0,
    upcomingAppointments: 0,
    gagnes: 0,
    conversion: 0,
    callsToday: 0,
  }

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const inSevenDays = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000
    ).toISOString()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const [
      usersResult,
      teamsResult,
      sitesResult,
      dispositionsResult,
      auditResult,
      leadsCount,
      leadsMonthCount,
      appointmentsCount,
      gagnesCount,
      callsCount,
      siteLinksResult,
    ] = await Promise.all([
      (supabase.from('profiles') as any)
        .select(
          'id, nom, prenom, email, role, team_id, telephone, actif, created_at, team:teams(nom)'
        )
        .order('created_at', { ascending: true }),
      (supabase.from('teams') as any).select('*').order('nom'),
      (supabase.from('sites') as any).select('*').order('nom'),
      (supabase.from('call_dispositions') as any).select('*').order('ordre'),
      (supabase.from('audit_log') as any)
        .select('id, table_name, operation, created_at, auteur:profiles(nom, prenom)')
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase.from('leads') as any).select('id', { count: 'exact', head: true }),
      (supabase.from('leads') as any)
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth),
      (supabase.from('appointments') as any)
        .select('id', { count: 'exact', head: true })
        .gte('debut', now.toISOString())
        .lte('debut', inSevenDays)
        .in('statut', ['planifie', 'confirme']),
      (supabase.from('leads') as any)
        .select('id', { count: 'exact', head: true })
        .eq('statut', 'gagne'),
      (supabase.from('calls') as any)
        .select('id', { count: 'exact', head: true })
        .gte('debut', startOfToday.toISOString()),
      (supabase.from('site_commerciaux') as any).select('site_id'),
    ])

    users = ((usersResult.data ?? []) as any[]).map((u) => ({
      id: u.id,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      role: u.role,
      team_id: u.team_id,
      team_nom: u.team?.nom ?? null,
      telephone: u.telephone,
      actif: u.actif,
      created_at: u.created_at,
    }))

    const membersByTeam = new Map<string, number>()
    users.forEach((u) => {
      if (u.team_id) {
        membersByTeam.set(u.team_id, (membersByTeam.get(u.team_id) ?? 0) + 1)
      }
    })

    teams = ((teamsResult.data ?? []) as any[]).map((t) => ({
      id: t.id,
      nom: t.nom,
      type: t.type,
      actif: t.actif,
      membres: membersByTeam.get(t.id) ?? 0,
    }))

    const commerciauxBySite = new Map<string, number>()
    ;((siteLinksResult.data ?? []) as { site_id: string }[]).forEach((link) => {
      commerciauxBySite.set(
        link.site_id,
        (commerciauxBySite.get(link.site_id) ?? 0) + 1
      )
    })

    sites = ((sitesResult.data ?? []) as any[]).map((s) => ({
      id: s.id,
      nom: s.nom,
      ville: s.ville,
      adresse: s.adresse,
      telephone: s.telephone,
      email: s.email,
      actif: s.actif,
      commerciaux: commerciauxBySite.get(s.id) ?? 0,
    }))

    dispositions = ((dispositionsResult.data ?? []) as any[]).map((d) => ({
      id: d.id,
      libelle: d.libelle,
      type: d.type,
      action: d.action,
      couleur: d.couleur,
      ordre: d.ordre,
      actif: d.actif,
    }))

    audit = ((auditResult.data ?? []) as any[]).map((a) => ({
      id: a.id,
      table_name: a.table_name,
      operation: a.operation,
      created_at: a.created_at,
      auteur: a.auteur ?? null,
    }))

    const totalLeads = leadsCount.count ?? 0
    const gagnes = gagnesCount.count ?? 0

    stats = {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.actif).length,
      totalLeads,
      leadsThisMonth: leadsMonthCount.count ?? 0,
      upcomingAppointments: appointmentsCount.count ?? 0,
      gagnes,
      conversion: totalLeads > 0 ? (gagnes / totalLeads) * 100 : 0,
      callsToday: callsCount.count ?? 0,
    }
  } catch {
    // En cas d'erreur de lecture, on garde des valeurs vides plutôt que de casser la page.
  }

  return (
    <AdminView
      users={users}
      teams={teams}
      sites={sites}
      dispositions={dispositions}
      audit={audit}
      stats={stats}
      isDemo={false}
    />
  )
}
