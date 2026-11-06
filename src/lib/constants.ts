// ============================================================
// OTOCLIC CRM — Constantes globales
// ============================================================

export const APP_NAME = 'Otoclic CRM'
export const APP_TIMEZONE = 'Africa/Casablanca'
export const APP_LOCALE = 'fr-MA'
export const APP_CURRENCY = 'MAD'
export const APP_PHONE_PREFIX = '+212'

// ============================================================
// PIPELINE STATUTS
// ============================================================
export const LEAD_STATUSES = [
  { value: 'nouveau',              label: 'Nouveau',              color: '#3B82F6', bgColor: 'bg-blue-100',   textColor: 'text-blue-800',   icon: '🆕' },
  { value: 'en_qualification_crc', label: 'En qualification CRC', color: '#8B5CF6', bgColor: 'bg-purple-100', textColor: 'text-purple-800',  icon: '📞' },
  { value: 'qualifie',             label: 'Qualifié',             color: '#06B6D4', bgColor: 'bg-cyan-100',   textColor: 'text-cyan-800',    icon: '✅' },
  { value: 'rdv_planifie',         label: 'RDV planifié',         color: '#F59E0B', bgColor: 'bg-amber-100',  textColor: 'text-amber-800',   icon: '📅' },
  { value: 'rdv_confirme',         label: 'RDV confirmé',         color: '#F97316', bgColor: 'bg-orange-100', textColor: 'text-orange-800',  icon: '✔️' },
  { value: 'rdv_effectue',         label: 'RDV effectué',         color: '#10B981', bgColor: 'bg-emerald-100',textColor: 'text-emerald-800', icon: '🤝' },
  { value: 'proposition',          label: 'Proposition',          color: '#EC4899', bgColor: 'bg-pink-100',   textColor: 'text-pink-800',    icon: '📄' },
  { value: 'gagne',                label: 'Gagné',                color: '#16A34A', bgColor: 'bg-green-100',  textColor: 'text-green-800',   icon: '🏆' },
  { value: 'perdu',                label: 'Perdu',                color: '#EF4444', bgColor: 'bg-red-100',    textColor: 'text-red-800',     icon: '❌' },
  { value: 'injoignable',          label: 'Injoignable',          color: '#6B7280', bgColor: 'bg-gray-100',   textColor: 'text-gray-800',    icon: '📵' },
  { value: 'a_rappeler',           label: 'À rappeler',           color: '#D97706', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800',  icon: '🔔' },
  { value: 'doublon',              label: 'Doublon',              color: '#9CA3AF', bgColor: 'bg-gray-100',   textColor: 'text-gray-600',    icon: '🔄' },
  { value: 'ne_pas_rappeler',      label: 'Ne pas rappeler',      color: '#1F2937', bgColor: 'bg-gray-800',   textColor: 'text-white',       icon: '🚫' },
] as const

// Statuts affichés dans le Kanban (hors terminaux)
export const KANBAN_STATUSES = [
  'nouveau',
  'en_qualification_crc',
  'qualifie',
  'rdv_planifie',
  'rdv_confirme',
  'rdv_effectue',
  'proposition',
] as const

// ============================================================
// RÔLES
// ============================================================
export const ROLES = [
  { value: 'admin',            label: 'Administrateur',         icon: '🛡️' },
  { value: 'superviseur_crc',  label: 'Superviseur CRC',        icon: '👁️' },
  { value: 'agent_crc',        label: 'Agent CRC',              icon: '📞' },
  { value: 'responsable_site', label: 'Responsable de site',    icon: '🏢' },
  { value: 'commercial',       label: 'Commercial',             icon: '💼' },
  { value: 'lecture_seule',    label: 'Lecture seule',          icon: '👓' },
] as const

// ============================================================
// STATUTS AGENTS CRC
// ============================================================
export const AGENT_STATUSES = [
  { value: 'disponible',   label: 'Disponible',    color: 'bg-green-500',  dotColor: 'text-green-500' },
  { value: 'en_appel',     label: 'En appel',      color: 'bg-red-500',    dotColor: 'text-red-500' },
  { value: 'pause',        label: 'En pause',      color: 'bg-yellow-500', dotColor: 'text-yellow-500' },
  { value: 'en_formation', label: 'En formation',  color: 'bg-blue-500',   dotColor: 'text-blue-500' },
  { value: 'hors_ligne',   label: 'Hors ligne',    color: 'bg-gray-400',   dotColor: 'text-gray-400' },
] as const

// ============================================================
// TYPES DE TÂCHES
// ============================================================
export const TASK_TYPES = [
  { value: 'rappel_appel',    label: 'Rappel téléphonique', icon: '📞', color: 'text-blue-600' },
  { value: 'whatsapp',        label: 'WhatsApp',            icon: '💬', color: 'text-green-600' },
  { value: 'email',           label: 'Email',               icon: '📧', color: 'text-purple-600' },
  { value: 'confirmation_rdv',label: 'Confirmation RDV',    icon: '✅', color: 'text-orange-600' },
  { value: 'reactivation',    label: 'Réactivation',        icon: '🔄', color: 'text-cyan-600' },
  { value: 'suivi_commercial',label: 'Suivi commercial',    icon: '💼', color: 'text-pink-600' },
] as const

// ============================================================
// TYPES DE RENDEZ-VOUS
// ============================================================
export const APPOINTMENT_TYPES = [
  { value: 'showroom', label: 'Showroom',   icon: '🏢' },
  { value: 'appel',    label: 'Appel',      icon: '📞' },
  { value: 'visio',    label: 'Visio',      icon: '🖥️' },
] as const

export const APPOINTMENT_STATUSES = [
  { value: 'planifie',   label: 'Planifié',   color: 'bg-blue-100 text-blue-800' },
  { value: 'confirme',   label: 'Confirmé',   color: 'bg-green-100 text-green-800' },
  { value: 'effectue',   label: 'Effectué',   color: 'bg-emerald-100 text-emerald-800' },
  { value: 'absent',     label: 'Absent',     color: 'bg-red-100 text-red-800' },
  { value: 'annule',     label: 'Annulé',     color: 'bg-gray-100 text-gray-800' },
  { value: 'replanifie', label: 'Replanifié', color: 'bg-yellow-100 text-yellow-800' },
] as const

// ============================================================
// TYPES D'ACTIVITÉS
// ============================================================
export const ACTIVITY_TYPES = [
  { value: 'appel',            label: 'Appel',                icon: '📞', color: 'text-blue-600' },
  { value: 'whatsapp',         label: 'WhatsApp',             icon: '💬', color: 'text-green-600' },
  { value: 'email',            label: 'Email',                icon: '📧', color: 'text-purple-600' },
  { value: 'note',             label: 'Note',                 icon: '📝', color: 'text-gray-600' },
  { value: 'rdv',              label: 'Rendez-vous',          icon: '📅', color: 'text-orange-600' },
  { value: 'changement_statut',label: 'Changement de statut', icon: '🔄', color: 'text-cyan-600' },
  { value: 'transfert',        label: 'Transfert',            icon: '↗️', color: 'text-pink-600' },
  { value: 'qualification',    label: 'Qualification',        icon: '✅', color: 'text-emerald-600' },
  { value: 'systeme',          label: 'Système',              icon: '⚙️', color: 'text-gray-400' },
] as const

// ============================================================
// CADENCE D'APPELS (configurable en DB)
// ============================================================
export const DEFAULT_CALL_CADENCE = {
  tentative_1: { delai_minutes: 0,    moment: 'immediat' },
  tentative_2: { delai_minutes: 180,  moment: 'J0+3h' },
  tentative_3: { delai_minutes: 1440, moment: 'J+1' },
  tentative_4: { delai_minutes: 2880, moment: 'J+2' },
  tentative_5: { delai_minutes: 5760, moment: 'J+4' },
  max_tentatives: 5,
  whatsapp_apres_tentative: 2,
  delai_injoignable_jours: 30,
} as const

// SLA & Timeouts
export const SLA_PREMIER_APPEL_MINUTES = 15
export const SLA_ESCALADE_MINUTES = 60
export const LEAD_LOCK_DURATION_MINUTES = 30
export const DEFAULT_PAGE_SIZE = 25

// Navigation
export const NAV_ITEMS = [
  {
    label: 'Tableau de bord',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['admin', 'superviseur_crc', 'agent_crc', 'responsable_site', 'commercial', 'lecture_seule'],
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: 'Users',
    roles: ['admin', 'superviseur_crc', 'agent_crc', 'responsable_site', 'commercial'],
  },
  {
    label: 'Ma file d\'appels',
    href: '/crc/file',
    icon: 'Phone',
    roles: ['agent_crc'],
  },
  {
    label: 'Supervision CRC',
    href: '/crc/supervision',
    icon: 'MonitorSpeaker',
    roles: ['admin', 'superviseur_crc'],
  },
  {
    label: 'Rendez-vous',
    href: '/rendez-vous',
    icon: 'CalendarDays',
    roles: ['admin', 'superviseur_crc', 'agent_crc', 'responsable_site', 'commercial'],
  },
  {
    label: 'Mes tâches',
    href: '/taches',
    icon: 'ClipboardList',
    roles: ['admin', 'superviseur_crc', 'agent_crc', 'responsable_site', 'commercial'],
  },
  {
    label: 'Paramètres',
    href: '/parametres',
    icon: 'Settings',
    roles: ['admin'],
  },
] as const
