'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  PhoneCall,
  Radio,
  RefreshCw,
  Users,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AGENT_STATUSES } from '@/lib/constants'
import { bulkReassignLeads, roundRobinAssignLeads } from '@/features/leads/sla-actions'
import SlaBoard, { type SlaLeadItem } from './SlaBoard'
import type { ProfileOption } from '@/components/appointments/types'

export interface AgentRow {
  id: string
  nom: string
  prenom?: string | null
  email?: string | null
  statut: string
  depuis?: string | null
  appelsJour: number
  rdvPris: number
  charge: number
}

export interface SupervisionMetrics {
  enAttente: number
  slaDepasse: number
  appelsJour: number
  rdvConfirmes: number
  tauxConversion: number
}

interface Props {
  initialAgents: AgentRow[]
  initialMetrics: SupervisionMetrics
  slaLeads: SlaLeadItem[]
  agentOptions: ProfileOption[]
  isDemo?: boolean
}

function statusMeta(statut: string) {
  return (
    AGENT_STATUSES.find((s) => s.value === statut) ?? {
      label: statut,
      color: 'bg-gray-400',
      dotColor: 'text-gray-400',
    }
  )
}

function formatDepuis(iso: string | null | undefined, now: Date): string {
  if (!iso) return '—'
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h} h ${m.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function SupervisionView({
  initialAgents,
  initialMetrics,
  slaLeads,
  agentOptions,
  isDemo,
}: Props) {
  const router = useRouter()
  const [agents, setAgents] = useState(initialAgents)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [now, setNow] = useState(() => new Date())
  const [bulkAgentId, setBulkAgentId] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [roundBusy, setRoundBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAgents(initialAgents)
    setMetrics(initialMetrics)
  }, [initialAgents, initialMetrics])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (isDemo) return
    const supabase = createClient()
    const channel = supabase
      .channel('supervision-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_status' },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        () => router.refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isDemo, router])

  const connected = useMemo(
    () => agents.filter((a) => !['hors_ligne'].includes(a.statut)).length,
    [agents]
  )
  const enAppel = useMemo(
    () => agents.filter((a) => a.statut === 'en_appel').length,
    [agents]
  )
  const disponible = useMemo(
    () => agents.filter((a) => a.statut === 'disponible').length,
    [agents]
  )

  async function handleRoundRobin() {
    setError(null)
    setMessage(null)
    setRoundBusy(true)

    if (isDemo) {
      setRoundBusy(false)
      setMessage('Mode démonstration : attribution simulée (aucune donnée modifiée).')
      return
    }

    const res = await roundRobinAssignLeads()
    setRoundBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Attribution impossible')
      return
    }
    setMessage(
      res.assigned && res.assigned > 0
        ? `${res.assigned} lead(s) attribué(s) automatiquement.`
        : res.message ?? 'Aucun lead non assigné.'
    )
    router.refresh()
  }

  async function handleBulkReassign() {
    if (!bulkAgentId) {
      setError('Sélectionnez un agent pour la réassignation.')
      return
    }
    const ids = slaLeads.map((l) => l.id).filter((id) => !id.startsWith('demo'))
    if (ids.length === 0) {
      setError('Aucun lead SLA réel à réassigner.')
      return
    }

    setError(null)
    setMessage(null)
    setBulkBusy(true)

    if (isDemo) {
      setBulkBusy(false)
      setMessage('Mode démonstration : réassignation simulée.')
      return
    }

    const res = await bulkReassignLeads(ids, bulkAgentId)
    setBulkBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Réassignation impossible')
      return
    }
    setMessage(`${res.reassigned ?? ids.length} lead(s) réassigné(s).`)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Supervision CRC en temps réel</h2>
          <p className="text-sm text-gray-500">
            Suivi des agents, charge des files et respect des SLAs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold rounded-lg">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Temps réel {isDemo ? 'démo' : 'actif'}
          </span>
          <button
            onClick={handleRoundRobin}
            disabled={roundBusy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            {roundBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            Attribution auto
          </button>
        </div>
      </div>

      {(message || error) && (
        <div
          className={`flex items-start justify-between gap-2 p-3 rounded-lg border text-xs ${
            error
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {error ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {error ?? message}
          </span>
          <button
            onClick={() => {
              setError(null)
              setMessage(null)
            }}
            className="opacity-60 hover:opacity-100 font-semibold"
          >
            ×
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Agents connectés
            </p>
            <Users className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {connected} / {agents.length}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {disponible} dispo · {enAppel} en appel
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Leads en attente
            </p>
            <Activity className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.enAttente}</p>
          <span
            className={`text-[11px] font-medium ${
              metrics.slaDepasse > 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {metrics.slaDepasse} hors SLA 60 min
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Appels aujourd’hui
            </p>
            <PhoneCall className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.appelsJour}</p>
          <span className="text-[11px] text-brand-600 font-medium">
            Moy.{" "}
            {agents.length > 0
              ? Math.round(metrics.appelsJour / agents.length)
              : 0}{' '}
            / agent
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Taux de conversion RDV
            </p>
            <RefreshCw className="w-4 h-4 text-gray-300" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {metrics.tauxConversion.toFixed(1)}%
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {metrics.rdvConfirmes} RDV confirmés
          </span>
        </div>
      </div>

      {/* SLA */}
      <SlaBoard initialLeads={slaLeads} agents={agentOptions} isDemo={isDemo} />

      {/* Actions groupées */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-900">Réassignation en masse</p>
            <p className="text-[11px] text-gray-400">
              Réaffecter tous les leads en alerte SLA à un agent disponible.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <select
              value={bulkAgentId}
              onChange={(e) => setBulkAgentId(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">Choisir un agent…</option>
              {agentOptions.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {[agent.prenom, agent.nom].filter(Boolean).join(' ')}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkReassign}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {bulkBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Users className="w-3.5 h-3.5" />
              )}
              Réassigner
            </button>
          </div>
        </div>
      </div>

      {/* Agents */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-sm">Statut des agents CRC</span>
          <span className="text-[11px] text-gray-400">Mise à jour automatique</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Agent</th>
                <th className="py-2.5 px-4 font-semibold">Statut</th>
                <th className="py-2.5 px-4 font-semibold">Depuis</th>
                <th className="py-2.5 px-4 font-semibold">Appels jour</th>
                <th className="py-2.5 px-4 font-semibold">RDV pris</th>
                <th className="py-2.5 px-4 font-semibold">Leads actifs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agents.map((agent) => {
                const meta = statusMeta(agent.statut)
                return (
                  <tr key={agent.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[11px] font-bold uppercase">
                          {(agent.prenom?.[0] ?? agent.nom[0]) + (agent.nom[0] ?? '')}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">
                            {[agent.prenom, agent.nom].filter(Boolean).join(' ')}
                          </p>
                          <p className="text-[10px] text-gray-400">{agent.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-700">
                        <span className={`w-2 h-2 rounded-full ${meta.color}`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                      {formatDepuis(agent.depuis, now)}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-gray-800">
                      {agent.appelsJour}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-emerald-700">
                      {agent.rdvPris}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          agent.charge > 15 ? 'text-amber-600' : 'text-gray-700'
                        }`}
                      >
                        {agent.charge}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-gray-400">
                    Aucun agent CRC actif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}