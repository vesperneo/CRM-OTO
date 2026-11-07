// ============================================================
// OTOCLIC CRM — Calcul des SLAs (premier appel & escalade)
// ============================================================

import { SLA_PREMIER_APPEL_MINUTES, SLA_ESCALADE_MINUTES } from './constants'

export type SlaLevel = 'ok' | 'attention' | 'depasse' | 'none'

export interface SlaLeadInput {
  statut: string
  created_at: string
  nb_tentatives_appel?: number | null
  dernier_contact?: string | null
}

export interface SlaInfo {
  eligible: boolean
  level: SlaLevel
  minutesEcoulees: number
  minutesRestantes: number
  echeance: Date | null
  label: string
}

const LEVEL_LABELS: Record<SlaLevel, string> = {
  ok: 'Dans les délais',
  attention: 'SLA bientôt dépassé',
  depasse: 'SLA dépassé',
  none: 'Hors SLA',
}

export const SLA_BADGES: Record<SlaLevel, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  attention: 'bg-amber-100 text-amber-800',
  depasse: 'bg-red-100 text-red-800',
  none: 'bg-gray-100 text-gray-600',
}

export function getSlaLevelLabel(level: SlaLevel): string {
  return LEVEL_LABELS[level]
}

/**
 * SLA applicable aux nouveaux leads qui n'ont jamais été contactés.
 * - Objectif : premier appel < 15 min
 * - Escalade superviseur : > 60 min
 */
export function computeLeadSla(lead: SlaLeadInput, now: Date = new Date()): SlaInfo {
  const eligible =
    lead.statut === 'nouveau' &&
    (lead.nb_tentatives_appel ?? 0) === 0 &&
    !lead.dernier_contact

  if (!eligible) {
    return {
      eligible: false,
      level: 'none',
      minutesEcoulees: 0,
      minutesRestantes: 0,
      echeance: null,
      label: LEVEL_LABELS.none,
    }
  }

  const created = new Date(lead.created_at)
  const minutesEcoulees = Math.max(
    0,
    Math.floor((now.getTime() - created.getTime()) / 60_000)
  )
  const echeance = new Date(created.getTime() + SLA_ESCALADE_MINUTES * 60_000)
  const minutesRestantes = SLA_ESCALADE_MINUTES - minutesEcoulees

  let level: SlaLevel = 'ok'
  if (minutesEcoulees >= SLA_ESCALADE_MINUTES) level = 'depasse'
  else if (minutesEcoulees >= SLA_PREMIER_APPEL_MINUTES) level = 'attention'

  return {
    eligible: true,
    level,
    minutesEcoulees,
    minutesRestantes,
    echeance,
    label: LEVEL_LABELS[level],
  }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m.toString().padStart(2, '0')}`
}

export function isSlaBreached(lead: SlaLeadInput, now: Date = new Date()): boolean {
  return computeLeadSla(lead, now).level === 'depasse'
}