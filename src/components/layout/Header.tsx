'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, ChevronDown } from 'lucide-react'
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
  '/leads': 'Gestion des leads',
  '/crc/file': "Ma file d'appels",
  '/crc/supervision': 'Supervision CRC',
  '/rendez-vous': 'Rendez-vous & Calendrier',
  '/taches': 'Mes tâches du jour',
  '/parametres': 'Paramètres',
}

export default function Header({ profile }: HeaderProps) {
  const pathname = usePathname()
  const [currentStatus, setCurrentStatus] = useState<string>('hors_ligne')
  const [isStatusOpen, setIsStatusOpen] = useState(false)
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

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] ?? 'Otoclic CRM'

  const activeStatusObj = AGENT_STATUSES.find(s => s.value === currentStatus) ?? AGENT_STATUSES[4]

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {profile.team?.nom && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            {profile.team.nom}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Statut Agent CRC dropdown */}
        {isCrcUser && (
          <div className="relative">
            <button
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${activeStatusObj.color}`} />
              <span>{activeStatusObj.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {isStatusOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Changer de statut
                </div>
                {AGENT_STATUSES.map(status => (
                  <button
                    key={status.value}
                    onClick={() => updateStatus(status.value)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className={`w-2 h-2 rounded-full ${status.color}`} />
                    <span>{status.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        {/* Profil compact */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
            {getInitiales(profile)}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-gray-900 leading-none">
              {getNomComplet(profile)}
            </p>
            <p className="text-[11px] text-gray-500 capitalize mt-0.5">
              {profile.role.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
