// ============================================================
// OTOCLIC CRM — Cadence automatique de tentatives d'appel
// Configuration : src/lib/constants.ts (DEFAULT_CALL_CADENCE)
// ============================================================

import { DEFAULT_CALL_CADENCE } from './constants'

export interface CadenceStep {
  /** Numéro de la tentative À VENIR (2 = après le 1er appel) */
  tentative: number
  delaiMinutes: number
  label: string
  echeance: Date
}

export interface CadencePlan {
  exhausted: boolean
  step: CadenceStep | null
  reactivationEcheance: Date | null
  whatsappApresTentative: number
}

const CADENCE_STEPS: { tentative: number; delaiMinutes: number; label: string }[] = [
  { tentative: 2, delaiMinutes: 180, label: 'J0 + 3h' },
  { tentative: 3, delaiMinutes: 1440, label: 'J+1' },
  { tentative: 4, delaiMinutes: 2880, label: 'J+2' },
  { tentative: 5, delaiMinutes: 5760, label: 'J+4' },
]

const MAX_TENTATIVES = DEFAULT_CALL_CADENCE.max_tentatives
const REACTIVATION_DAYS = DEFAULT_CALL_CADENCE.delai_injoignable_jours

/**
 * Planifie la prochaine tentative après `attemptsMade` appels sans réponse.
 * `attemptsMade = 1` → prochaine tentative dans 3 h (tentative n°2).
 */
export function getCadencePlan(
  attemptsMade: number,
  from: Date = new Date()
): CadencePlan {
  const exhausted = attemptsMade >= MAX_TENTATIVES

  if (exhausted) {
    return {
      exhausted: true,
      step: null,
      reactivationEcheance: addDays(from, REACTIVATION_DAYS),
      whatsappApresTentative: DEFAULT_CALL_CADENCE.whatsapp_apres_tentative,
    }
  }

  const nextTentative = Math.max(1, attemptsMade) + 1
  const config = CADENCE_STEPS.find((s) => s.tentative === nextTentative)

  if (!config) {
    return {
      exhausted: true,
      step: null,
      reactivationEcheance: addDays(from, REACTIVATION_DAYS),
      whatsappApresTentative: DEFAULT_CALL_CADENCE.whatsapp_apres_tentative,
    }
  }

  return {
    exhausted: false,
    step: {
      ...config,
      echeance: addMinutes(from, config.delaiMinutes),
    },
    reactivationEcheance: null,
    whatsappApresTentative: DEFAULT_CALL_CADENCE.whatsapp_apres_tentative,
  }
}

export function shouldSendWhatsApp(attemptsMade: number): boolean {
  return attemptsMade === DEFAULT_CALL_CADENCE.whatsapp_apres_tentative
}

export function getNextTentativeLabel(attemptsMade: number): string {
  const plan = getCadencePlan(attemptsMade)
  if (plan.exhausted) return 'Cadence terminée — réactivation J+30'
  return `Tentative ${plan.step?.tentative} prévue (${plan.step?.label})`
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60_000)
}