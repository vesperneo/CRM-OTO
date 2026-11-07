import type { Database, UserRole, LeadStatus, AgentAvailability, ActivityType, TaskType, TaskStatus, AppointmentStatus, AppointmentType } from './database.types'

export type {
  UserRole,
  LeadStatus,
  AgentAvailability,
  ActivityType,
  TaskType,
  TaskStatus,
  AppointmentStatus,
  AppointmentType
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Lead with relations
export type LeadWithRelations = Tables<'leads'> & {
  source?: Tables<'sources'> | null
  site_prefere?: Tables<'sites'> | null
  assigne_crc?: Pick<Tables<'profiles'>, 'id' | 'nom' | 'prenom' | 'avatar_url'> | null
  assigne_commercial?: Pick<Tables<'profiles'>, 'id' | 'nom' | 'prenom' | 'avatar_url'> | null
  tags?: Tables<'tags'>[]
  latest_call?: Tables<'calls'> | null
  upcoming_appointment?: Tables<'appointments'> | null
  open_tasks_count?: number
}

// Profile with team
export type ProfileWithTeam = Tables<'profiles'> & {
  team?: Tables<'teams'> | null
  agent_status?: Tables<'agent_status'> | null
}

// Call with relations
export type CallWithRelations = Tables<'calls'> & {
  agent?: Pick<Tables<'profiles'>, 'id' | 'nom' | 'prenom'> | null
  disposition?: Tables<'call_dispositions'> | null
  lead?: Pick<Tables<'leads'>, 'id' | 'nom' | 'prenom' | 'telephone'> | null
}

// Appointment with relations
export type AppointmentWithRelations = Tables<'appointments'> & {
  lead?: Pick<Tables<'leads'>, 'id' | 'nom' | 'prenom' | 'telephone'> | null
  site?: Tables<'sites'> | null
  pris_par?: Pick<Tables<'profiles'>, 'id' | 'nom' | 'prenom'> | null
  assigne_a?: Pick<Tables<'profiles'>, 'id' | 'nom' | 'prenom'> | null
}

// Task with relations
export type TaskWithRelations = Tables<'tasks_relances'> & {
  lead?: Pick<Tables<'leads'>, 'id' | 'nom' | 'prenom' | 'telephone' | 'statut'> | null
  assigne_a_profile?: Pick<Tables<'profiles'>, 'id' | 'nom' | 'prenom'> | null
}

// Activity with author
export type ActivityWithAuthor = Tables<'activities'> & {
  auteur?: Pick<Tables<'profiles'>, 'id' | 'nom' | 'prenom' | 'avatar_url'> | null
}

// Pipeline kanban
export type KanbanColumn = {
  status: LeadStatus
  label: string
  color: string
  leads: LeadWithRelations[]
  count: number
}

// Pagination
export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Lead filters
export type LeadFilters = {
  search?: string
  statuts?: LeadStatus[]
  source_ids?: string[]
  site_ids?: string[]
  assigne_crc_a?: string
  assigne_commercial_a?: string
  date_debut?: string
  date_fin?: string
  page?: number
  pageSize?: number
  sort?: string
  order?: 'asc' | 'desc'
}

