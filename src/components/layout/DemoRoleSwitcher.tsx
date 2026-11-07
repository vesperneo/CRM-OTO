'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, FlaskConical, Check } from 'lucide-react'
import {
  DEMO_PROFILES,
  DEMO_ROLE_COOKIE,
  DEMO_ROLE_LABELS,
  getRoleHome,
  type DemoRole,
} from '@/lib/demo-profile'

interface Props {
  currentRole: DemoRole
}

export default function DemoRoleSwitcher({ currentRole }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  function switchRole(role: DemoRole) {
    document.cookie = `${DEMO_ROLE_COOKIE}=${role}; path=/; max-age=31536000; SameSite=Lax`
    setOpen(false)
    router.push(getRoleHome(role))
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Mode démo — rôle actuel : ${DEMO_ROLE_LABELS[currentRole]}`}
        className="flex h-9 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
        title="Changer de rôle pour tester les panneaux"
      >
        <FlaskConical className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Démo</span>
        <span className="hidden font-semibold sm:inline">
          {DEMO_ROLE_LABELS[currentRole]}
        </span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            aria-label="Tester un rôle"
            className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"
          >
            <div className="px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Tester un rôle
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                Mode démo — aucune donnée réelle n’est modifiée
              </p>
            </div>
            {(Object.keys(DEMO_PROFILES) as DemoRole[]).map(role => {
              const p = DEMO_PROFILES[role]
              const active = role === currentRole
              return (
                <button
                  key={role}
                  type="button"
                  role="menuitem"
                  onClick={() => switchRole(role)}
                  className={[
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                    active ? 'bg-brand-50' : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold',
                      active
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-gray-100 text-gray-600',
                    ].join(' ')}
                  >
                    {p.prenom[0]}
                    {p.nom[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-gray-900">
                      {DEMO_ROLE_LABELS[role]}
                    </span>
                    <span className="block truncate text-[11px] text-gray-400">
                      {p.prenom} {p.nom}
                    </span>
                  </span>
                  {active && <Check className="h-4 w-4 text-brand-600" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
