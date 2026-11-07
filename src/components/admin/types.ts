export interface AdminUser {
  id: string
  nom: string
  prenom?: string | null
  email: string
  role: string
  team_id?: string | null
  team_nom?: string | null
  telephone?: string | null
  actif: boolean
  created_at?: string
}

export interface AdminTeam {
  id: string
  nom: string
  type: string
  actif: boolean
  membres: number
}

export interface AdminSite {
  id: string
  nom: string
  ville: string
  adresse?: string | null
  telephone?: string | null
  email?: string | null
  actif: boolean
  commerciaux?: number
}

export interface AdminDisposition {
  id: string
  libelle: string
  type: string
  action: string
  couleur: string
  ordre: number
  actif: boolean
}

export interface AdminAuditEntry {
  id: number
  table_name: string
  operation: string
  created_at: string
  auteur?: { nom: string; prenom?: string | null } | null
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalLeads: number
  leadsThisMonth: number
  upcomingAppointments: number
  gagnes: number
  conversion: number
  callsToday: number
}

export interface AdminData {
  users: AdminUser[]
  teams: AdminTeam[]
  sites: AdminSite[]
  dispositions: AdminDisposition[]
  audit: AdminAuditEntry[]
  stats: AdminStats
}
