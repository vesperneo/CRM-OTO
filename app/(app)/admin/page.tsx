import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/profile'
import { getRoleHome } from '@/lib/auth/profile'
import AdminView from '@/components/admin/AdminView'
import type {
  AdminAuditEntry,
  AdminDisposition,
  AdminSite,
  AdminTeam,
  AdminUser,
} from '@/components/admin/types'

export default async function AdminPage() {
  const { profile } = await getCurrentProfile()

  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect(getRoleHome(profile.role))

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
    />
  )
}
