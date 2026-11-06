import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { APP_TIMEZONE, APP_CURRENCY, APP_LOCALE } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | Date | null | undefined, fmt = 'dd/MM/yyyy'): string {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(d, fmt, { locale: fr })
  } catch {
    return '—'
  }
}

export function formatDateTime(dateStr: string | Date | null | undefined): string {
  return formatDate(dateStr, 'dd/MM/yyyy HH:mm')
}

export function formatTimeAgo(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (isToday(d)) {
      return `Aujourd'hui à ${format(d, 'HH:mm', { locale: fr })}`
    }
    if (isTomorrow(d)) {
      return `Demain à ${format(d, 'HH:mm', { locale: fr })}`
    }
    if (isYesterday(d)) {
      return `Hier à ${format(d, 'HH:mm', { locale: fr })}`
    }
    return formatDistanceToNow(d, { addSuffix: true, locale: fr })
  } catch {
    return '—'
  }
}

export function normaliserTelephone(tel: string): string {
  if (!tel) return tel
  const t = tel.replace(/[^0-9+]/g, '')
  if (/^0[0-9]{9}$/.test(t)) {
    return '+212' + t.slice(1)
  }
  if (/^212[0-9]{9}$/.test(t)) {
    return '+' + t
  }
  if (/^\+212[0-9]{9}$/.test(t)) {
    return t
  }
  return t
}

export function formatTelephone(tel: string | null | undefined): string {
  if (!tel) return '—'
  const norm = normaliserTelephone(tel)
  if (norm.startsWith('+212')) {
    const digits = norm.slice(4)
    return `+212 ${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`
  }
  return norm
}

export function makeWhatsAppLink(tel: string | null | undefined, message?: string): string {
  if (!tel) return '#'
  const norm = normaliserTelephone(tel).replace('+', '')
  const encoded = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${norm}${encoded}`
}

export function makeTelLink(tel: string | null | undefined): string {
  if (!tel) return '#'
  return `tel:${normaliserTelephone(tel)}`
}

export function formatMontant(amount: number | null | undefined, currency = APP_CURRENCY): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat(APP_LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function calculerScoreLead(lead: {
  budget?: number | null
  source_id?: string | null
  consentement_contact?: boolean
  nb_tentatives_appel?: number
  financement?: boolean | null
  delai_achat?: string | null
}): number {
  let score = 0

  if (lead.budget) {
    if (lead.budget >= 500000) score += 30
    else if (lead.budget >= 300000) score += 20
    else if (lead.budget >= 150000) score += 10
    else score += 5
  }

  if (lead.consentement_contact) score += 20

  if (lead.delai_achat) {
    if (lead.delai_achat.includes('1 mois') || lead.delai_achat.includes('immédiat')) score += 30
    else if (lead.delai_achat.includes('3 mois')) score += 20
    else if (lead.delai_achat.includes('6 mois')) score += 10
    else score += 5
  }

  if (lead.financement) score += 10

  if (lead.nb_tentatives_appel === 0) score += 10
  else if (lead.nb_tentatives_appel === 1) score += 5

  return Math.min(100, score)
}

export function getNomComplet(profil: { nom: string; prenom?: string | null } | null | undefined): string {
  if (!profil) return '—'
  return [profil.prenom, profil.nom].filter(Boolean).join(' ')
}

export function getInitiales(profil: { nom: string; prenom?: string | null } | null | undefined): string {
  if (!profil) return '?'
  const p = profil.prenom?.charAt(0).toUpperCase() ?? ''
  const n = profil.nom?.charAt(0).toUpperCase() ?? ''
  return p + n || '?'
}

export function truncate(str: string | null | undefined, maxLength = 50): string {
  if (!str) return '—'
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str
}

export function formatDureeAppel(secondes: number | null | undefined): string {
  if (!secondes) return '—'
  const m = Math.floor(secondes / 60)
  const s = secondes % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
