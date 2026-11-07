'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Phone,
  ShieldAlert,
  UserCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { escalateLead, reassignLead } from '@/features/leads/sla-actions'
import { computeLeadSla, formatMinutes, SLA_BADGES, getSlaLevelLabel } from '@/lib/sla'
import type { ProfileOption } from '@/components/appointments/types'

export interface SlaLeadItem {
  id: string
  nom: string
  prenom?: string | null
  telephone: string
  statut: string
  created_at: string
  nb_tentatives_appel?: number | null
  dernier_contact?: string | null
  escalade_le?: string | null
  assigne_crc_a?: string | null
  assigne?: { nom: string; prenom?: string | null } | null
  source?: { nom: string } | null
  __demo?: boolean
}

interface Props {
  initialLeads: SlaLeadItem[]
  agents: ProfileOption[]
  isDemo?: boolean
}

export default function SlaBoard({ initialLeads, agents, isDemo }: Props) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [now, setNow] = useState(() => new Date())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (isDemo) return
    const supabase = createClient()
    const channel = supabase
      .channel('sla-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => router.refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isDemo, router])

  const breached = useMemo(() => {
    return leads
      .filter((lead) => !lead.escalade_le)
      .map((lead) => ({ lead, sla: computeLeadSla(lead, now) }))
      .filter(({ sla }) => sla.eligible && sla.level !== 'ok')
      .sort((a, b) => b.sla.minutesEcoulees - a.sla.minutesEcoulees)
  }, [leads, now])

  const depasseCount = breached.filter(({ sla }) => sla.level === 'depasse').length

  async function handleEscalate(lead: SlaLeadItem) {
    setError(null)
    setBusyId(lead.id)

    if (lead.__demo) {
      setLeads((prev) => prev.filter((l) => l.id !== lead.id))
      setBusyId(null)
      return
    }

    const res = await escalateLead(
      lead.id,
      `SLA dépassé (${formatMinutes(computeLeadSla(lead, now).minutesEcoulees)}) — escalade superviseur`
    )
    setBusyId(null)
    if (!res.success) {
      setError(res.error ?? 'Escalade impossible')
      return
    }
    setLeads((prev) => prev.filter((l) => l.id !== lead.id))
    router.refresh()
  }

  async function handleReassign(lead: SlaLeadItem, agentId: string) {
    if (!agentId || agentId === lead.assigne_crc_a) return
    setError(null)
    setBusyId(lead.id)

    if (lead.__demo) {
      const agent = agents.find((a) => a.id === agentId)
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? {
                ...l,
                assigne_crc_a: agentId,
                assigne: agent ? { nom: agent.nom, prenom: agent.prenom } : l.assigne,
              }
            : l
        )
      )
      setBusyId(null)
      return
    }

    const res = await reassignLead(lead.id, agentId)
    setBusyId(null)
    if (!res.success) {
      setError(res.error ?? 'Réassignation impossible')
      return
    }
    const agent = agents.find((a) => a.id === agentId)
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? {
              ...l,
              assigne_crc_a: agentId,
              assigne: agent ? { nom: agent.nom, prenom: agent.prenom } : l.assigne,
            }
          : l
      )
    )
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Alertes SLA — premier appel</h3>
            <p className="text-[11px] text-gray-400">
              Objectif &lt; 15 min · escalade superviseur &gt; 60 min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {depasseCount} dépassé{depasseCount > 1 ? 's' : ''}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            {breached.length - depasseCount} à surveiller
          </span>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 text-red-700 text-xs">
          {error}
        </div>
      )}

      {breached.length === 0 ? (
        <div className="p-8 text-center">
          <UserCheck className="w-9 h-9 text-emerald-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-700">
            Aucun lead en dépassement SLA
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Tous les nouveaux leads ont été contactés dans les délais.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {breached.map(({ lead, sla }) => {
            const busy = busyId === lead.id
            return (
              <div key={lead.id} className="p-4 hover:bg-gray-50/60 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">
                        {[lead.prenom, lead.nom].filter(Boolean).join(' ')}
                      </p>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SLA_BADGES[sla.level]}`}
                      >
                        {getSlaLevelLabel(sla.level)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatMinutes(sla.minutesEcoulees)} écoulées
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <a
                        href={`tel:${lead.telephone}`}
                        className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 font-medium"
                      >
                        <Phone className="w-3 h-3" />
                        {lead.telephone}
                      </a>
                      <span className="text-[11px] text-gray-400">
                        Source : {lead.source?.nom ?? '—'}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Agent :{' '}
                        {lead.assigne
                          ? [lead.assigne.prenom, lead.assigne.nom].filter(Boolean).join(' ')
                          : 'Non assigné'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      defaultValue={lead.assigne_crc_a ?? ''}
                      onChange={(e) => handleReassign(lead, e.target.value)}
                      disabled={busy}
                      className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-[11px] bg-white text-gray-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="">Réassigner à…</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {[agent.prenom, agent.nom].filter(Boolean).join(' ')}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleEscalate(lead)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-[11px] font-semibold rounded-lg transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Escalader
                    </button>

                    <a
                      href={`/leads/${lead.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-[11px] font-medium rounded-lg"
                    >
                      Fiche
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      sla.level === 'depasse' ? 'bg-red-500' : 'bg-amber-400'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(8, (sla.minutesEcoulees / 60) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}