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
  Settings,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Tableau de bord',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['admin', 'superviseur_crc', 'agent_crc', 'responsable_commercial'],
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: 'Users',
    roles: ['admin', 'superviseur_crc', 'agent_crc', 'responsable_commercial'],
  },
  {
    label: 'Appels',
    href: '/calls',
    icon: 'Phone',
    roles: ['admin', 'superviseur_crc', 'agent_crc'],
  },
  {
    label: 'Supervision',
    href: '/supervision',
    icon: 'MonitorSpeaker',
    roles: ['admin', 'superviseur_crc'],
  },
  {
    label: 'Rendez-vous',
    href: '/appointments',
    icon: 'CalendarDays',
    roles: ['admin', 'superviseur_crc', 'agent_crc', 'responsable_commercial'],
  },
  {
    label: 'Tâches',
    href: '/tasks',
    icon: 'ClipboardList',
    roles: ['admin', 'superviseur_crc', 'agent_crc', 'responsable_commercial'],
  },
  {
    label: 'Paramètres',
    href: '/settings',
    icon: 'Settings',
    roles: ['admin'],
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
  Settings,
}

// ─── Status config ────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  superviseur_crc: 'Superviseur CRC',
  agent_crc: 'Agent CRC',
  responsable_commercial: 'Resp. Commercial',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nom: string, prenom?: string | null) {
  const parts = [prenom, nom].filter(Boolean)
  return parts
    .map(p => p![0].toUpperCase())
    .join('')
    .slice(0, 2)
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

  // Filter nav items by role
  const navItems = NAV_ITEMS.filter(item => item.roles.includes(profile.role))

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Expose toggle to Header via custom event
  useEffect(() => {
    const handler = () => setMobileOpen(prev => !prev)
    window.addEventListener('sidebar:toggle', handler)
    return () => window.removeEventListener('sidebar:toggle', handler)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div
      className={`
        flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* ── Logo ── */}
      <div
        className={`flex items-center gap-3 px-4 py-5 border-b border-gray-100 ${
          collapsed ? 'justify-center px-2' : ''
        }`}
      >
        <div className="flex-shrink-0 w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
          <Phone className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-bold text-gray-900 text-sm leading-tight block">Otoclic CRM</span>
            {profile.team && (
              <span className="text-xs text-gray-400 truncate block">{profile.team.nom}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map(item => {
          const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                ${collapsed ? 'justify-center px-2' : ''}
                ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <Icon
                className={`flex-shrink-0 w-5 h-5 transition-colors ${
                  active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                }`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Agent status dot (agent/superviseur only) ── */}
      {(profile.role === 'agent_crc' || profile.role === 'superviseur_crc') && !collapsed && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <span
              id="sidebar-status-dot"
              className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"
            />
            <span id="sidebar-status-label" className="text-xs text-gray-500">
              Disponible
            </span>
          </div>
        </div>
      )}

      {/* ── User footer ── */}
      <div className={`border-t border-gray-100 p-3 ${collapsed ? 'px-2' : ''}`}>
        <div
          className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''} mb-2`}
        >
          {/* Avatar */}
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.nom}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-100"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {getInitials(profile.nom, profile.prenom)}
            </div>
          )}

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile.prenom ? `${profile.prenom} ${profile.nom}` : profile.nom}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </p>
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Déconnexion"
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500
            hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50
            ${collapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{loggingOut ? 'Déconnexion…' : 'Déconnexion'}</span>}
        </button>
      </div>

      {/* ── Collapse toggle (desktop only) ── */}
      <button
        onClick={() => setCollapsed(prev => !prev)}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200
                   rounded-full items-center justify-center shadow-sm hover:bg-gray-50 transition-colors z-10"
        title={collapsed ? 'Étendre' : 'Réduire'}
        style={{ position: 'absolute' }}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        )}
      </button>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex relative flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* ── Mobile overlay + drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <aside className="relative z-50 flex flex-col w-64 max-w-[80vw] h-full shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 z-10 p-1 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Same content but always expanded */}
            <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64">
              {/* Logo */}
              <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
                <div className="flex-shrink-0 w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-gray-900 text-sm leading-tight block">Otoclic CRM</span>
                  {profile.team && (
                    <span className="text-xs text-gray-400 truncate block">{profile.team.nom}</span>
                  )}
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
                {navItems.map(item => {
                  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
                  const active = isActive(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                        ${
                          active
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon
                        className={`flex-shrink-0 w-5 h-5 transition-colors ${
                          active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {active && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                      )}
                    </Link>
                  )
                })}
              </nav>

              {/* Status badge mobile */}
              {(profile.role === 'agent_crc' || profile.role === 'superviseur_crc') && (
                <div className="px-4 py-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-xs text-gray-500">Disponible</span>
                  </div>
                </div>
              )}

              {/* User footer mobile */}
              <div className="border-t border-gray-100 p-3">
                <div className="flex items-center gap-3 mb-2">
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={profile.nom}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-100"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {getInitials(profile.nom, profile.prenom)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile.prenom ? `${profile.prenom} ${profile.nom}` : profile.nom}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {ROLE_LABELS[profile.role] ?? profile.role}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500
                             hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  <span>{loggingOut ? 'Déconnexion…' : 'Déconnexion'}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
