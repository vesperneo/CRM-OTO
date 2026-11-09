'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Gauge,
  Headphones,
  Mail,
  Pencil,
  PhoneCall,
  Plus,
  Power,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  X,
  XCircle,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { formatDate, getInitiales } from '@/lib/utils'
import { ROLES } from '@/lib/constants'
import {
  inviterUtilisateur,
  saveDisposition,
  saveSite,
  saveTeam,
  updateUserProfile,
  deleteUser,
  deleteTeam,
  deleteSite,
  deleteDisposition,
} from '@/features/admin/actions'
import type {
  AdminData,
  AdminDisposition,
  AdminSite,
  AdminTeam,
  AdminUser,
} from './types'

interface Props extends AdminData {
  isDemo?: boolean
}

type Tab = 'overview' | 'users' | 'teams' | 'dispositions' | 'audit'

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'overview', label: "Vue d'ensemble", icon: Activity },
  { key: 'users', label: 'Utilisateurs', icon: Users },
  { key: 'teams', label: 'Équipes & sites', icon: Building2 },
  { key: 'dispositions', label: "Dispositions d'appel", icon: PhoneCall },
  { key: 'audit', label: "Journal d'audit", icon: ClipboardList },
]

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  superviseur_crc: 'bg-brand-100 text-brand-800 border-brand-200',
  agent_crc: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  responsable_site: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  commercial: 'bg-amber-100 text-amber-800 border-amber-200',
  lecture_seule: 'bg-gray-100 text-gray-700 border-gray-200',
}

const TEAM_TYPE_LABELS: Record<string, string> = {
  crc: 'CRC',
  showroom: 'Showroom',
  autre: 'Autre',
}

const ACTION_LABELS: Record<string, string> = {
  creer_relance: 'Créer une relance',
  changer_statut: 'Changer le statut',
  creer_rdv: 'Créer un RDV',
  cloturer: 'Clôturer',
  envoyer_whatsapp: 'Envoyer WhatsApp',
  envoyer_email: 'Envoyer un email',
  marquer_dnc: 'Marquer DNC',
  rien: 'Aucune',
}

const ORDERS = [
  'creer_relance',
  'changer_statut',
  'creer_rdv',
  'cloturer',
  'envoyer_whatsapp',
  'envoyer_email',
  'marquer_dnc',
  'rien',
]

function roleLabel(role: string) {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  tone: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function AdminView({
  users: initialUsers,
  teams: initialTeams,
  sites: initialSites,
  dispositions: initialDispositions,
  audit,
  stats,
  isDemo,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [users, setUsers] = useState(initialUsers)
  const [teams, setTeams] = useState(initialTeams)
  const [sites, setSites] = useState(initialSites)
  const [dispositions, setDispositions] = useState(initialDispositions)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [userModal, setUserModal] = useState<AdminUser | null>(null)
  const [teamModal, setTeamModal] = useState<AdminTeam | 'new' | null>(null)
  const [siteModal, setSiteModal] = useState<AdminSite | 'new' | null>(null)
  const [dispModal, setDispModal] = useState<AdminDisposition | 'new' | null>(null)

  const [userForm, setUserForm] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    role: 'agent_crc',
    team_id: '',
    actif: true,
  })

  const [inviteForm, setInviteForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    role: 'agent_crc',
    team_id: '',
  })
  const [teamForm, setTeamForm] = useState({
    nom: '',
    type: 'crc',
  })
  const [siteForm, setSiteForm] = useState({
    nom: '',
    ville: '',
    adresse: '',
    telephone: '',
    email: '',
  })
  const [dispForm, setDispForm] = useState({
    libelle: '',
    type: 'repondu',
    action: 'rien',
    couleur: '#6B7280',
    ordre: 0,
  })

  // En mode réel, on resynchronise après chaque revalidation serveur.
  // En mode démo, l'état local doit être conservé.
  useEffect(() => {
    if (isDemo) return
    setUsers(initialUsers)
  }, [initialUsers, isDemo])

  useEffect(() => {
    if (isDemo) return
    setTeams(initialTeams)
  }, [initialTeams, isDemo])

  useEffect(() => {
    if (isDemo) return
    setSites(initialSites)
  }, [initialSites, isDemo])

  useEffect(() => {
    if (isDemo) return
    setDispositions(initialDispositions)
  }, [initialDispositions, isDemo])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (!q) return true
      return (
        u.nom.toLowerCase().includes(q) ||
        (u.prenom ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    })
  }, [users, search, roleFilter])

  const activeUsers = users.filter((u) => u.actif).length
  const roleCounts = ROLES.map((r) => ({
    ...r,
    count: users.filter((u) => u.role === r.value).length,
  })).filter((r) => r.count > 0)
  const maxRole = Math.max(1, ...roleCounts.map((r) => r.count))

  function flash(message: string) {
    setNotice(message)
    setError(null)
  }

  function fail(message: string) {
    setError(message)
    setNotice(null)
  }

  async function patchUser(id: string, patch: Partial<AdminUser>) {
    setSaving(true)
    setError(null)

    if (!isDemo) {
      const res = await updateUserProfile(id, {
        role: patch.role,
        team_id: patch.team_id,
        actif: patch.actif,
      })
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Mise à jour impossible.')
        return
      }
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u
        const next = { ...u, ...patch }
        if ('team_id' in patch) {
          next.team_nom = teams.find((t) => t.id === patch.team_id)?.nom ?? null
        }
        return next
      })
    )
    setSaving(false)
    router.refresh()
    flash('Utilisateur mis à jour.')
  }

  function openUser(user: AdminUser) {
    setUserModal(user)
    setUserForm({
      prenom: user.prenom ?? '',
      nom: user.nom,
      telephone: user.telephone ?? '',
      role: user.role,
      team_id: user.team_id ?? '',
      actif: user.actif,
    })
  }

  async function handleUserSave() {
    if (!userModal) return
    setSaving(true)
    setError(null)

    const patch = {
      prenom: userForm.prenom.trim() || null,
      nom: userForm.nom.trim(),
      telephone: userForm.telephone.trim() || null,
      role: userForm.role,
      team_id: userForm.team_id || null,
      actif: userForm.actif,
    }

    if (!isDemo) {
      const res = await updateUserProfile(userModal.id, patch)
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Mise à jour impossible.')
        return
      }
    }

    const teamNom = teams.find((t) => t.id === patch.team_id)?.nom ?? null
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userModal.id
          ? { ...u, ...patch, team_nom: teamNom }
          : u
      )
    )
    setSaving(false)
    setUserModal(null)
    router.refresh()
    flash('Utilisateur mis à jour.')
  }

  async function handleInvite() {
    setSaving(true)
    setError(null)

    if (!isDemo) {
      const res = await inviterUtilisateur({
        email: inviteForm.email,
        nom: inviteForm.nom,
        prenom: inviteForm.prenom,
        role: inviteForm.role,
        team_id: inviteForm.team_id || null,
      })
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Invitation impossible.')
        return
      }
    }

    const team = teams.find((t) => t.id === inviteForm.team_id)

    if (isDemo) {
      const newUser: AdminUser = {
        id: `demo-user-${Date.now()}`,
        nom: inviteForm.nom,
        prenom: inviteForm.prenom,
        email: inviteForm.email,
        role: inviteForm.role,
        team_id: inviteForm.team_id || null,
        team_nom: team?.nom ?? null,
        actif: true,
        created_at: new Date().toISOString(),
      }
      setUsers((prev) => [newUser, ...prev])
    }

    setSaving(false)
    setInviteOpen(false)
    setInviteForm({ prenom: '', nom: '', email: '', role: 'agent_crc', team_id: '' })
    router.refresh()
    flash(
      isDemo
        ? 'Invitation simulée : le nouvel utilisateur a été ajouté à la liste.'
        : 'Invitation envoyée par email.'
    )
  }

  function openTeam(team?: AdminTeam) {
    setTeamModal(team ?? 'new')
    setTeamForm({
      nom: team?.nom ?? '',
      type: team?.type ?? 'crc',
    })
  }

  async function handleTeamSave() {
    if (!teamModal) return
    setSaving(true)
    setError(null)
    const editing = teamModal === 'new' ? null : teamModal

    if (!isDemo) {
      const res = await saveTeam({
        id: editing?.id,
        nom: teamForm.nom,
        type: teamForm.type,
        actif: editing?.actif ?? true,
      })
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Enregistrement impossible.')
        return
      }
    }

    if (isDemo) {
      if (editing) {
        setTeams((prev) =>
          prev.map((t) =>
            t.id === editing.id ? { ...t, nom: teamForm.nom, type: teamForm.type } : t
          )
        )
      } else {
        setTeams((prev) => [
          ...prev,
          {
            id: `demo-team-${Date.now()}`,
            nom: teamForm.nom,
            type: teamForm.type,
            actif: true,
            membres: 0,
          },
        ])
      }
    }

    setSaving(false)
    setTeamModal(null)
    router.refresh()
    flash(editing ? 'Équipe mise à jour.' : 'Équipe créée.')
  }

  async function toggleTeam(team: AdminTeam) {
    setSaving(true)
    if (!isDemo) {
      const res = await saveTeam({
        id: team.id,
        nom: team.nom,
        type: team.type,
        actif: !team.actif,
      })
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Mise à jour impossible.')
        return
      }
    }
    setTeams((prev) =>
      prev.map((t) => (t.id === team.id ? { ...t, actif: !t.actif } : t))
    )
    setSaving(false)
    router.refresh()
    flash(team.actif ? 'Équipe désactivée.' : 'Équipe réactivée.')
  }

  function openSite(site?: AdminSite) {
    setSiteModal(site ?? 'new')
    setSiteForm({
      nom: site?.nom ?? '',
      ville: site?.ville ?? '',
      adresse: site?.adresse ?? '',
      telephone: site?.telephone ?? '',
      email: site?.email ?? '',
    })
  }

  async function handleSiteSave() {
    if (!siteModal) return
    setSaving(true)
    setError(null)
    const editing = siteModal === 'new' ? null : siteModal

    if (!isDemo) {
      const res = await saveSite({
        id: editing?.id,
        nom: siteForm.nom,
        ville: siteForm.ville,
        adresse: siteForm.adresse,
        telephone: siteForm.telephone,
        email: siteForm.email,
        actif: editing?.actif ?? true,
      })
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Enregistrement impossible.')
        return
      }
    }

    if (isDemo) {
      if (editing) {
        setSites((prev) =>
          prev.map((s) =>
            s.id === editing.id ? { ...s, ...siteForm, actif: editing.actif } : s
          )
        )
      } else {
        setSites((prev) => [
          ...prev,
          {
            id: `demo-site-${Date.now()}`,
            nom: siteForm.nom,
            ville: siteForm.ville,
            adresse: siteForm.adresse,
            telephone: siteForm.telephone,
            email: siteForm.email,
            actif: true,
            commerciaux: 0,
          },
        ])
      }
    }

    setSaving(false)
    setSiteModal(null)
    router.refresh()
    flash(editing ? 'Site mis à jour.' : 'Site créé.')
  }

  async function toggleSite(site: AdminSite) {
    setSaving(true)
    if (!isDemo) {
      const res = await saveSite({
        id: site.id,
        nom: site.nom,
        ville: site.ville,
        adresse: site.adresse,
        telephone: site.telephone,
        email: site.email,
        actif: !site.actif,
      })
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Mise à jour impossible.')
        return
      }
    }
    setSites((prev) =>
      prev.map((s) => (s.id === site.id ? { ...s, actif: !s.actif } : s))
    )
    setSaving(false)
    router.refresh()
    flash(site.actif ? 'Site désactivé.' : 'Site réactivé.')
  }

  function openDisposition(disp?: AdminDisposition) {
    setDispModal(disp ?? 'new')
    setDispForm({
      libelle: disp?.libelle ?? '',
      type: disp?.type ?? 'repondu',
      action: disp?.action ?? 'rien',
      couleur: disp?.couleur ?? '#6B7280',
      ordre: disp?.ordre ?? dispositions.length + 1,
    })
  }

  async function handleDispositionSave() {
    if (!dispModal) return
    setSaving(true)
    setError(null)
    const editing = dispModal === 'new' ? null : dispModal

    if (!isDemo) {
      const res = await saveDisposition({
        id: editing?.id,
        libelle: dispForm.libelle,
        type: dispForm.type,
        action: dispForm.action,
        couleur: dispForm.couleur,
        ordre: Number(dispForm.ordre),
        actif: editing?.actif ?? true,
      })
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Enregistrement impossible.')
        return
      }
    }

    if (isDemo) {
      if (editing) {
        setDispositions((prev) =>
          prev.map((d) =>
            d.id === editing.id
              ? { ...d, ...dispForm, ordre: Number(dispForm.ordre) }
              : d
          )
        )
      } else {
        setDispositions((prev) => [
          ...prev,
          {
            id: `demo-disp-${Date.now()}`,
            ...dispForm,
            ordre: Number(dispForm.ordre),
            actif: true,
          },
        ])
      }
    }

    setSaving(false)
    setDispModal(null)
    router.refresh()
    flash(editing ? 'Disposition mise à jour.' : 'Disposition créée.')
  }

  async function toggleDisposition(disp: AdminDisposition) {
    setSaving(true)
    if (!isDemo) {
      const res = await saveDisposition({
        id: disp.id,
        libelle: disp.libelle,
        type: disp.type,
        action: disp.action,
        couleur: disp.couleur,
        ordre: disp.ordre,
        actif: !disp.actif,
      })
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Mise à jour impossible.')
        return
      }
    }
    setDispositions((prev) =>
      prev.map((d) => (d.id === disp.id ? { ...d, actif: !d.actif } : d))
    )
    setSaving(false)
    router.refresh()
    flash(disp.actif ? 'Disposition désactivée.' : 'Disposition réactivée.')
  }

  async function handleDeleteUser(user: AdminUser) {
    if (!confirm(`Supprimer définitivement l'utilisateur ${user.prenom ?? ''} ${user.nom} ?`)) return
    setSaving(true)
    if (!isDemo) {
      const res = await deleteUser(user.id)
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Suppression impossible.')
        return
      }
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id))
    setSaving(false)
    router.refresh()
    flash('Utilisateur supprimé.')
  }

  async function handleDeleteTeam(team: AdminTeam) {
    if (!confirm(`Supprimer l'équipe "${team.nom}" ?`)) return
    setSaving(true)
    if (!isDemo) {
      const res = await deleteTeam(team.id)
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Suppression impossible.')
        return
      }
    }
    setTeams((prev) => prev.filter((t) => t.id !== team.id))
    setSaving(false)
    router.refresh()
    flash('Équipe supprimée.')
  }

  async function handleDeleteSite(site: AdminSite) {
    if (!confirm(`Supprimer le site "${site.nom}" ?`)) return
    setSaving(true)
    if (!isDemo) {
      const res = await deleteSite(site.id)
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Suppression impossible.')
        return
      }
    }
    setSites((prev) => prev.filter((s) => s.id !== site.id))
    setSaving(false)
    router.refresh()
    flash('Site supprimé.')
  }

  async function handleDeleteDisposition(disp: AdminDisposition) {
    if (!confirm(`Supprimer la disposition "${disp.libelle}" ?`)) return
    setSaving(true)
    if (!isDemo) {
      const res = await deleteDisposition(disp.id)
      if (!res.success) {
        setSaving(false)
        fail(res.error ?? 'Suppression impossible.')
        return
      }
    }
    setDispositions((prev) => prev.filter((d) => d.id !== disp.id))
    setSaving(false)
    router.refresh()
    flash('Disposition supprimée.')
  }


  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Panneau administrateur</h2>
            <p className="text-sm text-gray-500">
              Pilotage des utilisateurs, équipes, sites et configuration du CRM
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Inviter un utilisateur
        </button>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice(null)}>
            <X className="w-4 h-4 opacity-60" />
          </button>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="w-4 h-4 opacity-60" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${active
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="Utilisateurs actifs"
              value={`${activeUsers}/${users.length}`}
              hint={`${teams.length} équipes · ${sites.length} sites`}
              icon={Users}
              tone="bg-brand-50 text-brand-600"
            />
            <StatCard
              label="Leads"
              value={stats.totalLeads.toLocaleString('fr-FR')}
              hint={`${stats.leadsThisMonth} nouveaux ce mois`}
              icon={Target}
              tone="bg-violet-50 text-violet-600"
            />
            <StatCard
              label="RDV à venir"
              value={String(stats.upcomingAppointments)}
              hint="7 prochains jours"
              icon={CalendarDays}
              tone="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Conversion"
              value={`${stats.conversion.toFixed(1)} %`}
              hint={`${stats.gagnes} leads gagnés`}
              icon={TrendingUp}
              tone="bg-amber-50 text-amber-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Répartition des rôles</h3>
                <span className="text-[11px] text-gray-400">{users.length} comptes</span>
              </div>
              <div className="space-y-3">
                {roleCounts.map((r) => (
                  <div key={r.value}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{r.label}</span>
                      <span className="text-gray-400">{r.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(r.count / maxRole) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-2">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Accès rapides</h3>
              {[
                {
                  label: 'Panneau superviseur',
                  desc: 'Temps réel & SLA',
                  href: '/superviseur',
                  icon: Gauge,
                },
                {
                  label: 'Espace agent CRC',
                  desc: 'File d’appels & tâches',
                  href: '/agent',
                  icon: Headphones,
                },
                {
                  label: 'Analytique',
                  desc: 'Performance & exports',
                  href: '/analytics',
                  icon: BarChart3,
                },
                {
                  label: 'Paramètres',
                  desc: 'Intégrations & conformité',
                  href: '/parametres',
                  icon: Settings,
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                      <p className="text-[10px] text-gray-400">{item.desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">Dernières actions</h3>
                <button
                  type="button"
                  onClick={() => setTab('audit')}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  Tout voir
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {audit.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${entry.operation === 'INSERT'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : entry.operation === 'DELETE'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-brand-50 text-brand-700 border-brand-200'
                        }`}
                    >
                      {entry.operation}
                    </span>
                    <span className="text-xs text-gray-700 flex-1 truncate">
                      {entry.table_name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatDate(entry.created_at, 'dd/MM HH:mm')}
                    </span>
                  </div>
                ))}
                {audit.length === 0 && (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    Aucune action enregistrée.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">État du système</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Utilisateurs configurés', value: users.length, icon: Users },
                  { label: 'Équipes actives', value: teams.filter((t) => t.actif).length, icon: Building2 },
                  { label: 'Sites ouverts', value: sites.filter((s) => s.actif).length, icon: Building2 },
                  {
                    label: 'Dispositions actives',
                    value: dispositions.filter((d) => d.actif).length,
                    icon: PhoneCall,
                  },
                ].map((row) => {
                  const Icon = row.icon
                  return (
                    <div key={row.label} className="flex items-center gap-2.5">
                      <Icon className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-600 flex-1">{row.label}</span>
                      <span className="text-xs font-bold text-gray-900">{row.value}</span>
                    </div>
                  )
                })}
              </div>
              <Link
                href="/parametres"
                className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-3.5 h-3.5" />
                Configurer les intégrations
              </Link>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un utilisateur…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-2 border border-gray-200 rounded-lg text-xs bg-white"
              >
                <option value="all">Tous les rôles</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Inviter
            </button>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Utilisateur</th>
                  <th className="px-4 py-2.5 font-semibold">Rôle</th>
                  <th className="px-4 py-2.5 font-semibold">Équipe</th>
                  <th className="px-4 py-2.5 font-semibold">Statut</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {getInitiales(u)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {[u.prenom, u.nom].filter(Boolean).join(' ')}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={saving}
                        onChange={(e) => patchUser(u.id, { role: e.target.value })}
                        className={`text-[11px] font-semibold border rounded-full px-2.5 py-1 ${ROLE_STYLES[u.role] ?? ROLE_STYLES.lecture_seule
                          }`}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.team_id ?? ''}
                        disabled={saving}
                        onChange={(e) =>
                          patchUser(u.id, { team_id: e.target.value || null })
                        }
                        className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 max-w-[170px]"
                      >
                        <option value="">Sans équipe</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nom}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${u.actif ? 'text-emerald-700' : 'text-gray-400'
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${u.actif ? 'bg-emerald-500' : 'bg-gray-300'
                            }`}
                        />
                        {u.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          title="Modifier"
                          disabled={saving}
                          onClick={() => openUser(u)}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title={u.actif ? 'Désactiver' : 'Réactiver'}
                          disabled={saving}
                          onClick={() => patchUser(u.id, { actif: !u.actif })}
                          className={`p-1.5 rounded-lg border transition-colors ${u.actif
                              ? 'border-red-100 text-red-600 hover:bg-red-50'
                              : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                            }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Supprimer l'utilisateur"
                          disabled={saving}
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-50">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold">
                    {getInitiales(u)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {[u.prenom, u.nom].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ROLE_STYLES[u.role] ?? ROLE_STYLES.lecture_seule
                      }`}
                  >
                    {roleLabel(u.role)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={u.role}
                    disabled={saving}
                    onChange={(e) => patchUser(u.id, { role: e.target.value })}
                    className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={u.team_id ?? ''}
                    disabled={saving}
                    onChange={(e) => patchUser(u.id, { team_id: e.target.value || null })}
                    className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option value="">Sans équipe</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold ${u.actif ? 'text-emerald-700' : 'text-gray-400'}`}>
                    {u.actif ? 'Compte actif' : 'Compte inactif'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => openUser(u)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      title="Modifier l'utilisateur"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => patchUser(u.id, { actif: !u.actif })}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {u.actif ? 'Désactiver' : 'Réactiver'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleDeleteUser(u)}
                      className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      title="Supprimer l'utilisateur"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-10">
              Aucun utilisateur ne correspond à la recherche.
            </p>
          )}
        </div>
      )}

      {tab === 'teams' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Équipes</h3>
                <p className="text-[11px] text-gray-400">
                  CRC, showrooms et structures internes
                </p>
              </div>
              <button
                type="button"
                onClick={() => openTeam()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle équipe
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-xl border p-4 ${t.actif ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-70'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {TEAM_TYPE_LABELS[t.type] ?? t.type}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mt-2">{t.nom}</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {t.membres} membre{t.membres > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => openTeam(t)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="w-3 h-3" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => toggleTeam(t)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border ${t.actif
                          ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                    >
                      {t.actif ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleDeleteTeam(t)}
                      className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      title="Supprimer l'équipe"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Sites & showrooms</h3>
                <p className="text-[11px] text-gray-400">
                  Lieux de rendez-vous et contacts
                </p>
              </div>
              <button
                type="button"
                onClick={() => openSite()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouveau site
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {sites.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-xl border p-4 ${s.actif ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-70'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.actif
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                      {s.actif ? 'Ouvert' : 'Fermé'}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mt-2">{s.nom}</h4>
                  <p className="text-[11px] text-gray-500">{s.ville}</p>
                  {s.telephone && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.telephone}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={() => openSite(s)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="w-3 h-3" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => toggleSite(s)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border ${s.actif
                          ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                    >
                      {s.actif ? 'Fermer' : 'Ouvrir'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleDeleteSite(s)}
                      className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      title="Supprimer le site"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'dispositions' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Dispositions d’appel</h3>
              <p className="text-[11px] text-gray-400">
                Issues proposées aux agents CRC et actions automatiques
              </p>
            </div>
            <button
              type="button"
              onClick={() => openDisposition()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Libellé</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Action automatique</th>
                  <th className="px-4 py-2.5 font-semibold">Ordre</th>
                  <th className="px-4 py-2.5 font-semibold">Statut</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...dispositions]
                  .sort((a, b) => a.ordre - b.ordre)
                  .map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: d.couleur }}
                          />
                          <span className="text-xs font-semibold text-gray-900">
                            {d.libelle}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-500">{d.type}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          {ACTION_LABELS[d.action] ?? d.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-500">{d.ordre}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] font-semibold ${d.actif ? 'text-emerald-700' : 'text-gray-400'
                            }`}
                        >
                          {d.actif ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDisposition(d)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                            title="Modifier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => toggleDisposition(d)}
                            className={`p-1.5 rounded-lg border ${d.actif
                                ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            title={d.actif ? 'Désactiver' : 'Activer'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleDeleteDisposition(d)}
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            title="Supprimer la disposition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <div>
              <h3 className="text-sm font-bold text-gray-900">Journal d’audit</h3>
              <p className="text-[11px] text-gray-400">
                Modifications sur les leads et les rendez-vous
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {audit.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${entry.operation === 'INSERT'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : entry.operation === 'DELETE'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-brand-50 text-brand-700 border-brand-200'
                    }`}
                >
                  {entry.operation}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800">{entry.table_name}</p>
                  <p className="text-[10px] text-gray-400">
                    {entry.auteur
                      ? [entry.auteur.prenom, entry.auteur.nom].filter(Boolean).join(' ')
                      : 'Système'}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {formatDate(entry.created_at, 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            ))}
            {audit.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-10">
                Aucune entrée d’audit.
              </p>
            )}
          </div>
        </div>
      )}

      {userModal && (
        <Modal
          title="Modifier l’utilisateur"
          subtitle={userModal.email}
          onClose={() => setUserModal(null)}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Prénom
                </label>
                <input
                  value={userForm.prenom}
                  onChange={(e) =>
                    setUserForm({ ...userForm, prenom: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Nom *
                </label>
                <input
                  value={userForm.nom}
                  onChange={(e) => setUserForm({ ...userForm, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Téléphone
              </label>
              <input
                value={userForm.telephone}
                onChange={(e) =>
                  setUserForm({ ...userForm, telephone: e.target.value })
                }
                placeholder="+212661000000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Rôle
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Équipe
                </label>
                <select
                  value={userForm.team_id}
                  onChange={(e) =>
                    setUserForm({ ...userForm, team_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Sans équipe</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={userForm.actif}
                onChange={(e) =>
                  setUserForm({ ...userForm, actif: e.target.checked })
                }
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Compte actif
            </label>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserModal(null)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving || !userForm.nom.trim()}
                onClick={handleUserSave}
                className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {inviteOpen && (
        <Modal
          title="Inviter un utilisateur"
          subtitle="Un email d’activation sera envoyé (Supabase Auth)."
          onClose={() => setInviteOpen(false)}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Prénom
                </label>
                <input
                  value={inviteForm.prenom}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, prenom: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Nom *
                </label>
                <input
                  value={inviteForm.nom}
                  onChange={(e) => setInviteForm({ ...inviteForm, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  placeholder="prenom.nom@otoclic.ma"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Rôle
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Équipe
                </label>
                <select
                  value={inviteForm.team_id}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, team_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Sans équipe</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving || !inviteForm.nom || !inviteForm.email}
                onClick={handleInvite}
                className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold"
              >
                {saving ? 'Envoi…' : 'Envoyer l’invitation'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {teamModal && (
        <Modal
          title={teamModal === 'new' ? 'Nouvelle équipe' : 'Modifier l’équipe'}
          onClose={() => setTeamModal(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Nom *
              </label>
              <input
                value={teamForm.nom}
                onChange={(e) => setTeamForm({ ...teamForm, nom: e.target.value })}
                placeholder="CRC Central Casablanca"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Type
              </label>
              <select
                value={teamForm.type}
                onChange={(e) => setTeamForm({ ...teamForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="crc">CRC</option>
                <option value="showroom">Showroom</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTeamModal(null)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving || !teamForm.nom}
                onClick={handleTeamSave}
                className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {siteModal && (
        <Modal
          title={siteModal === 'new' ? 'Nouveau site' : 'Modifier le site'}
          onClose={() => setSiteModal(null)}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Nom *
                </label>
                <input
                  value={siteForm.nom}
                  onChange={(e) => setSiteForm({ ...siteForm, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Ville *
                </label>
                <input
                  value={siteForm.ville}
                  onChange={(e) => setSiteForm({ ...siteForm, ville: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Adresse
              </label>
              <input
                value={siteForm.adresse}
                onChange={(e) => setSiteForm({ ...siteForm, adresse: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Téléphone
                </label>
                <input
                  value={siteForm.telephone}
                  onChange={(e) =>
                    setSiteForm({ ...siteForm, telephone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Email
                </label>
                <input
                  value={siteForm.email}
                  onChange={(e) => setSiteForm({ ...siteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSiteModal(null)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving || !siteForm.nom || !siteForm.ville}
                onClick={handleSiteSave}
                className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {dispModal && (
        <Modal
          title={
            dispModal === 'new' ? "Nouvelle disposition" : 'Modifier la disposition'
          }
          onClose={() => setDispModal(null)}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Libellé *
              </label>
              <input
                value={dispForm.libelle}
                onChange={(e) => setDispForm({ ...dispForm, libelle: e.target.value })}
                placeholder="Répondu — Intéressé"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Type
                </label>
                <input
                  value={dispForm.type}
                  onChange={(e) => setDispForm({ ...dispForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Ordre
                </label>
                <input
                  type="number"
                  value={dispForm.ordre}
                  onChange={(e) =>
                    setDispForm({ ...dispForm, ordre: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Action automatique
              </label>
              <select
                value={dispForm.action}
                onChange={(e) => setDispForm({ ...dispForm, action: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                {ORDERS.map((action) => (
                  <option key={action} value={action}>
                    {ACTION_LABELS[action]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Couleur
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={dispForm.couleur}
                  onChange={(e) =>
                    setDispForm({ ...dispForm, couleur: e.target.value })
                  }
                  className="w-10 h-9 rounded-lg border border-gray-200 bg-white p-0.5"
                />
                <input
                  value={dispForm.couleur}
                  onChange={(e) =>
                    setDispForm({ ...dispForm, couleur: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDispModal(null)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving || !dispForm.libelle}
                onClick={handleDispositionSave}
                className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
