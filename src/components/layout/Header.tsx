'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, ChevronDown, Menu } from 'lucide-react'
import { getNomComplet, getInitiales } from '@/lib/utils'
import { AGENT_STATUSES } from '@/lib/constants'
interface HeaderProfile {
  id: string
  nom: string
  prenom?: string | null
  role: string
  avatar_url?: string | null
  team?: { nom: string } | null
}

interface HeaderProps {
  profile: HeaderProfile
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/admin': 'Panneau administrateur',
  '/superviseur': 'Panneau superviseur',
  '/agent': 'Espace agent CRC',
  '/leads': 'Gestion des leads',
  '/crc/file': "Ma file d'appels",
  '/crc/supervision': 'Supervision CRC',
  '/rendez-vous': 'Rendez-vous & calendrier',
  '/taches': 'Mes tâches du jour',
  '/analytics': 'Analytique & reporting',
  '/conformite': 'Conformité CNDP',
  '/parametres': 'Paramètres',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  superviseur_crc: 'Superviseur CRC',
  agent_crc: 'Agent CRC',
  responsable_site: 'Responsable de site',
  commercial: 'Commercial',
  lecture_seule: 'Lecture seule',
}

export default function Header({ profile }: HeaderProps) {
  const pathname = usePathname()
  const [currentStatus, setCurrentStatus] = useState<string>('hors_ligne')
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const isCrcUser = ['agent_crc', 'superviseur_crc'].includes(profile.role)

  useEffect(() => {
    if (!isCrcUser) return

    const supabase = createClient()
    supabase
      .from('agent_status')
      .select('statut')
      .eq('agent_id', profile.id)
      .single()
      .then(({ data }: { data: any }) => {
        if (data?.statut) {
          setCurrentStatus(data.statut)
        }
      })
  }, [profile.id, isCrcUser])

  useEffect(() => {
    if (!isStatusOpen) return

    const onPointerDown = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsStatusOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isStatusOpen])

  async function updateStatus(newStatus: string) {
    setCurrentStatus(newStatus)
    setIsStatusOpen(false)

    const supabase = createClient()
    await (supabase.from('agent_status') as any).upsert({
      agent_id: profile.id,
      statut: newStatus,
      depuis: new Date().toISOString(),
    })
  }

  function toggleMobileSidebar() {
    window.dispatchEvent(new Event('sidebar:toggle'))
  }

  const title =
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ??
    'Otoclic CRM'

  const activeStatusObj =
    AGENT_STATUSES.find(s => s.value === currentStatus) ?? AGENT_STATUSES[4]

  return (
    <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white/90 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          aria-label="Ouvrir la navigation"
          className="btn-icon -ml-1 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-gray-900">
            {title}
          </h1>
          {profile.team?.nom && (
            <p className="hidden truncate text-[11px] text-gray-400 sm:block">
              {profile.team.nom}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Statut Agent CRC */}
        {isCrcUser && (
          <div className="relative" ref={statusRef}>
            <button
              type="button"
              onClick={() => setIsStatusOpen(open => !open)}
              aria-haspopup="menu"
              aria-expanded={isStatusOpen}
              className="flex h-9 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <span className={`h-2 w-2 rounded-full ${activeStatusObj.color}`} />
              <span className="hidden sm:inline">{activeStatusObj.label}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>

            {isStatusOpen && (
              <div
                role="menu"
                aria-label="Changer de statut"
                className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"
              >
                <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Changer de statut
                </p>
                {AGENT_STATUSES.map(status => (
                  <button
                    key={status.value}
                    type="button"
                    role="menuitem"
                    onClick={() => updateStatus(status.value)}
                    className={[
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                      status.value === currentStatus
                        ? 'bg-brand-50 font-medium text-brand-700'
                        : 'text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span className={`h-2 w-2 rounded-full ${status.color}`} />
                    <span>{status.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="btn-icon relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-600 ring-2 ring-white" />
        </button>

        <div className="mx-1 hidden h-6 w-px bg-gray-200 sm:block" />

        {/* Profil */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white shadow-sm">
            {getInitiales(profile)}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-[13px] font-semibold leading-tight text-gray-900">
              {getNomComplet(profile)}
            </p>
            <p className="text-[11px] leading-tight text-gray-400">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
