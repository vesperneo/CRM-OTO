'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  Phone,
  MonitorSpeaker,
  CalendarDays,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  Settings,
  Shield,
  Gauge,
  Headphones,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  LucideIcon,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SidebarProfile {
  id: string
  nom: string
  prenom?: string | null
  role: string
  avatar_url?: string | null
  team?: { nom: string } | null
}

interface NavItem {
  label: string
  href: string
  icon: string
  roles: string[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Pilotage',
    items: [
      {
        label: 'Tableau de bord',
        href: '/dashboard',
        icon: 'LayoutDashboard',
        roles: ['admin', 'superviseur_crc', 'agent_crc', 'responsable_site', 'commercial', 'lecture_seule'],
      },
      {
        label: 'Panneau admin',
        href: '/admin',
        icon: 'Shield',
        roles: ['admin'],
      },
      {
        label: 'Panneau superviseur',
        href: '/superviseur',
        icon: 'Gauge',
        roles: ['admin', 'superviseur_crc'],
      },
      {
        label: 'Espace agent',
        href: '/agent',
        icon: 'Headphones',
        roles: ['admin', 'agent_crc'],
      },
    ],
  },
  {
    title: 'Opérations',
    items: [
      {
        label: 'Leads',
        href: '/leads',
        icon: 'Users',
        roles: ['admin', 'superviseur_crc', 'agent_crc', 'responsable_site', 'commercial'],
      },
      {
        label: "Ma file d'appels",
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
    ],
  },
  {
    title: 'Analyse & administration',
    items: [
      {
        label: 'Analytique',
        href: '/analytics',
        icon: 'BarChart3',
        roles: ['admin', 'superviseur_crc', 'responsable_site'],
      },
      {
        label: 'Conformité CNDP',
        href: '/conformite',
        icon: 'ShieldCheck',
        roles: ['admin', 'superviseur_crc'],
      },
      {
        label: 'Paramètres',
        href: '/parametres',
        icon: 'Settings',
        roles: ['admin'],
      },
    ],
  },
]

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Phone,
  MonitorSpeaker,
  CalendarDays,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  Settings,
  Shield,
  Gauge,
  Headphones,
}

// ─── Status config ────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  superviseur_crc: 'Superviseur CRC',
  agent_crc: 'Agent CRC',
  responsable_site: 'Responsable de site',
  commercial: 'Commercial',
  lecture_seule: 'Lecture seule',
}

const COLLAPSE_KEY = 'otoclic:sidebar-collapsed'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nom: string, prenom?: string | null) {
  const parts = [prenom, nom].filter(Boolean)
  return parts
    .map(p => p![0].toUpperCase())
    .join('')
    .slice(0, 2)
}

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SidebarNavProps {
  sections: NavSection[]
  collapsed: boolean
  pathname: string
  onNavigate?: () => void
}

function SidebarNav({ sections, collapsed, pathname, onNavigate }: SidebarNavProps) {
  return (
    <nav
      aria-label="Navigation principale"
      className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3"
    >
      {sections.map(section => (
        <div key={section.title} className="mb-4 last:mb-0">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
              {section.title}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map(item => {
              const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
              const active = isActivePath(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'group relative flex items-center gap-3 rounded-lg text-sm transition-colors duration-150',
                    collapsed ? 'h-10 justify-center px-2' : 'h-10 px-3',
                    active
                      ? 'bg-brand-50 font-semibold text-brand-700'
                      : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  ].join(' ')}
                >
                  {active && !collapsed && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand-600"
                    />
                  )}
                  <Icon
                    className={[
                      'flex-shrink-0 w-[18px] h-[18px] transition-colors',
                      active
                        ? 'text-brand-600'
                        : 'text-gray-400 group-hover:text-gray-600',
                    ].join(' ')}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

interface SidebarBodyProps {
  profile: SidebarProfile
  collapsed: boolean
  pathname: string
  loggingOut: boolean
  onLogout: () => void
  onToggleCollapsed?: () => void
  onNavigate?: () => void
}

function SidebarBody({
  profile,
  collapsed,
  pathname,
  loggingOut,
  onLogout,
  onToggleCollapsed,
  onNavigate,
}: SidebarBodyProps) {
  const sections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => item.roles.includes(profile.role)),
  })).filter(section => section.items.length > 0)

  const showStatus =
    profile.role === 'agent_crc' || profile.role === 'superviseur_crc'

  return (
    <div
      className={[
        'relative flex h-full flex-col border-r border-gray-200 bg-white',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      ].join(' ')}
    >
      {/* Logo */}
      <div
        className={[
          'flex h-16 shrink-0 items-center gap-3 border-b border-gray-100',
          collapsed ? 'justify-center px-2' : 'px-4',
        ].join(' ')}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 shadow-sm">
          <Phone className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="block text-sm font-semibold leading-tight text-gray-900">
              Otoclic CRM
            </span>
            <span className="block truncate text-[11px] leading-tight text-gray-400">
              {profile.team?.nom ?? 'Espace de travail'}
            </span>
          </div>
        )}
      </div>

      <SidebarNav
        sections={sections}
        collapsed={collapsed}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      {/* Agent status */}
      {showStatus && (
        <div className={collapsed ? 'px-2 pb-2' : 'px-3 pb-2'}>
          <div
            className={[
              'flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50',
              collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
            ].join(' ')}
            title="Statut agent"
          >
            <span
              id="sidebar-status-dot"
              className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
            />
            {!collapsed && (
              <span id="sidebar-status-label" className="text-xs font-medium text-gray-600">
                Disponible
              </span>
            )}
          </div>
        </div>
      )}

      {/* User footer */}
      <div className="border-t border-gray-100 p-3">
        <div
          className={[
            'flex items-center gap-3 rounded-lg',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.nom}
              className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-gray-100"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700 ring-1 ring-brand-100">
              {getInitials(profile.nom, profile.prenom)}
            </div>
          )}

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-gray-900">
                {profile.prenom ? `${profile.prenom} ${profile.nom}` : profile.nom}
              </p>
              <p className="truncate text-[11px] text-gray-400">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          title="Déconnexion"
          className={[
            'mt-2 flex h-9 w-full items-center gap-2 rounded-lg px-3 text-[13px] font-medium',
            'text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600',
            'disabled:opacity-50',
            collapsed ? 'justify-center px-2' : '',
          ].join(' ')}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{loggingOut ? 'Déconnexion…' : 'Déconnexion'}</span>}
        </button>
      </div>

      {/* Collapse toggle (desktop only) */}
      {onToggleCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Étendre la navigation' : 'Réduire la navigation'}
          title={collapsed ? 'Étendre' : 'Réduire'}
          className="absolute -right-3 top-[68px] hidden h-6 w-6 items-center justify-center rounded-full
                     border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors
                     hover:bg-gray-50 hover:text-gray-700 md:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SidebarProps {
  profile: SidebarProfile
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const handler = () => setMobileOpen(prev => !prev)
    window.addEventListener('sidebar:toggle', handler)
    return () => window.removeEventListener('sidebar:toggle', handler)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="relative hidden flex-shrink-0 md:flex">
        <SidebarBody
          profile={profile}
          collapsed={collapsed}
          pathname={pathname}
          loggingOut={loggingOut}
          onLogout={handleLogout}
          onToggleCollapsed={() => setCollapsed(prev => !prev)}
        />
      </aside>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative z-50 h-full shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fermer la navigation"
              className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <SidebarBody
              profile={profile}
              collapsed={false}
              pathname={pathname}
              loggingOut={loggingOut}
              onLogout={handleLogout}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  )
}
