'use client'

import { useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarCheck,
  Download,
  FileSpreadsheet,
  PhoneCall,
  Printer,
  Target,
  TrendingUp,
  Users,
  UserX,
} from 'lucide-react'
import { LEAD_STATUSES } from '@/lib/constants'
import { downloadCsv, downloadExcel, printReport, todaySlug } from '@/lib/export'

export interface FunnelRow {
  statut: string
  total: number
  trente_jours?: number
}

export interface DailyLeadsRow {
  jour: string
  total: number
}

export interface DailyCallsRow {
  jour: string
  appels: number
  duree_moyenne?: number
  agents_actifs?: number
}

export interface DailyAppointmentsRow {
  jour: string
  total: number
  confirmes: number
  effectues: number
  absents: number
}

export interface SourceRow {
  source: string
  leads: number
  qualifies: number
  rdv: number
  gagnes: number
  taux_rdv: number
}

export interface AgentPerfRow {
  id?: string
  agent: string
  role?: string
  appels: number
  rdv_pris: number
  leads_traites: number
}

export interface AnalyticsTotals {
  caGenere: number
  escalades: number
}

interface Props {
  funnel: FunnelRow[]
  dailyLeads: DailyLeadsRow[]
  dailyCalls: DailyCallsRow[]
  dailyAppointments: DailyAppointmentsRow[]
  sources: SourceRow[]
  agents: AgentPerfRow[]
  totals: AnalyticsTotals
}

type Period = 7 | 30 | 90

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function statusMeta(statut: string) {
  return (
    LEAD_STATUSES.find((s) => s.value === statut) ?? {
      label: statut,
      color: '#9CA3AF',
    }
  )
}

function formatJour(jour: string): string {
  const [y, m, d] = jour.split('-')
  return `${d}/${m}`
}

function formatMAD(value: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(value)
}

function TrendChart({
  series,
  labels,
  height = 200,
}: {
  series: { name: string; color: string; values: number[] }[]
  labels: string[]
  height?: number
}) {
  const width = 720
  const padding = { top: 16, right: 16, bottom: 26, left: 36 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const count = Math.max(1, labels.length)

  function points(values: number[]) {
    return values.map((value, i) => {
      const x =
        padding.left + (count === 1 ? innerW / 2 : (i / (count - 1)) * innerW)
      const y = padding.top + innerH - (value / max) * innerH
      return `${x},${y}`
    })
  }

  const gridSteps = 4
  const labelEvery = Math.max(1, Math.ceil(count / 6))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="Évolution des indicateurs"
    >
      {Array.from({ length: gridSteps + 1 }).map((_, i) => {
        const y = padding.top + (i / gridSteps) * innerH
        const value = Math.round(max - (i / gridSteps) * max)
        return (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
            <text
              x={padding.left - 6}
              y={y + 3}
              textAnchor="end"
              fontSize={9}
              fill="#94a3b8"
            >
              {value}
            </text>
          </g>
        )
      })}

      {series.map((s) => {
        const pts = points(s.values)
        const area = `${padding.left},${padding.top + innerH} ${pts.join(' ')} ${
          padding.left + innerW
        },${padding.top + innerH}`
        return (
          <g key={s.name}>
            <polygon points={area} fill={s.color} opacity={0.07} />
            <polyline
              points={pts.join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {pts.map((pt, i) => {
              const [x, y] = pt.split(',')
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={count > 45 ? 1.2 : 2}
                  fill={s.color}
                />
              )
            })}
          </g>
        )
      })}

      {labels.map((label, i) => {
        if (i % labelEvery !== 0 && i !== labels.length - 1) return null
        const x =
          padding.left + (count === 1 ? innerW / 2 : (i / (count - 1)) * innerW)
        return (
          <text
            key={`${label}-${i}`}
            x={x}
            y={height - 8}
            textAnchor="middle"
            fontSize={9}
            fill="#94a3b8"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}

export default function AnalyticsView({
  funnel,
  dailyLeads,
  dailyCalls,
  dailyAppointments,
  sources,
  agents,
  totals,
}: Props) {
  const [period, setPeriod] = useState<Period>(30)

  const filteredLeads = useMemo(
    () => dailyLeads.slice(-period),
    [dailyLeads, period]
  )
  const filteredCalls = useMemo(
    () => dailyCalls.slice(-period),
    [dailyCalls, period]
  )
  const filteredAppointments = useMemo(
    () => dailyAppointments.slice(-period),
    [dailyAppointments, period]
  )

  const kpis = useMemo(() => {
    const leads = filteredLeads.reduce((sum, r) => sum + toNumber(r.total), 0)
    const appels = filteredCalls.reduce((sum, r) => sum + toNumber(r.appels), 0)
    const rdv = filteredAppointments.reduce((sum, r) => sum + toNumber(r.total), 0)
    const absents = filteredAppointments.reduce(
      (sum, r) => sum + toNumber(r.absents),
      0
    )
    const effectues = filteredAppointments.reduce(
      (sum, r) => sum + toNumber(r.effectues),
      0
    )
    return {
      leads,
      appels,
      rdv,
      absents,
      effectues,
      tauxRdv: leads > 0 ? (rdv / leads) * 100 : 0,
      noShow: rdv > 0 ? (absents / rdv) * 100 : 0,
      dureeMoyenne:
        filteredCalls.length > 0
          ? Math.round(
              filteredCalls.reduce(
                (sum, r) => sum + toNumber(r.duree_moyenne),
                0
              ) / filteredCalls.length
            )
          : 0,
    }
  }, [filteredLeads, filteredCalls, filteredAppointments])

  const funnelMax = Math.max(1, ...funnel.map((f) => toNumber(f.total)))
  const sourceMax = Math.max(1, ...sources.map((s) => toNumber(s.leads)))
  const agentMax = Math.max(1, ...agents.map((a) => toNumber(a.appels)))

  const chartLabels = filteredLeads.map((r) => formatJour(r.jour))
  const chartSeries = [
    {
      name: 'Leads',
      color: '#da3655',
      values: filteredLeads.map((r) => toNumber(r.total)),
    },
    {
      name: 'Appels',
      color: '#8b5cf6',
      values: filteredCalls.map((r) => toNumber(r.appels)),
    },
    {
      name: 'RDV',
      color: '#10b981',
      values: filteredAppointments.map((r) => toNumber(r.total)),
    },
  ]

  const exportHeaders = [
    'Statut',
    'Total',
    '30 derniers jours',
  ]
  const exportRows = funnel.map((f) => [
    statusMeta(f.statut).label,
    toNumber(f.total),
    toNumber(f.trente_jours),
  ])

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analytique & Pilotage</h2>
          <p className="text-sm text-gray-500">
            Performance CRC, conversion showroom et qualité des sources
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
            {([7, 30, 90] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  period === p
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {p} j
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                downloadCsv(`analytics-funnel-${todaySlug()}`, exportHeaders, exportRows)
              }
              title="Exporter CSV"
              className="p-2 border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() =>
                downloadExcel(
                  `analytics-${todaySlug()}`,
                  'Rapport analytique Otoclic',
                  exportHeaders,
                  exportRows
                )
              }
              title="Exporter Excel"
              className="p-2 border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() =>
                printReport('Rapport analytique Otoclic', exportHeaders, exportRows)
              }
              title="Imprimer / PDF"
              className="p-2 border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: 'Leads entrants',
            value: kpis.leads.toLocaleString('fr-FR'),
            note: `${period} derniers jours`,
            icon: Users,
            tint: 'text-brand-600 bg-brand-50',
          },
          {
            label: 'Appels passés',
            value: kpis.appels.toLocaleString('fr-FR'),
            note: `Durée moy. ${Math.floor(kpis.dureeMoyenne / 60)}:${String(
              kpis.dureeMoyenne % 60
            ).padStart(2, '0')}`,
            icon: PhoneCall,
            tint: 'text-violet-600 bg-violet-50',
          },
          {
            label: 'RDV showroom',
            value: kpis.rdv.toLocaleString('fr-FR'),
            note: `${kpis.tauxRdv.toFixed(1)}% des leads`,
            icon: CalendarCheck,
            tint: 'text-emerald-600 bg-emerald-50',
          },
          {
            label: 'Taux de no-show',
            value: `${kpis.noShow.toFixed(1)}%`,
            note: `${kpis.absents} absent(s)`,
            icon: UserX,
            tint: 'text-red-600 bg-red-50',
          },
          {
            label: 'CA généré',
            value: formatMAD(totals.caGenere),
            note: `${totals.escalades} escalade(s) SLA`,
            icon: TrendingUp,
            tint: 'text-amber-600 bg-amber-50',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                {kpi.label}
              </p>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${kpi.tint}`}>
                <kpi.icon className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900 mt-1.5">{kpi.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{kpi.note}</p>
          </div>
        ))}
      </div>

      {/* Courbe */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Tendance d’activité</h3>
            <p className="text-[11px] text-gray-400">
              Leads, appels et rendez-vous par jour
            </p>
          </div>
          <div className="flex items-center gap-3">
            {chartSeries.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
        {chartLabels.length > 0 ? (
          <TrendChart series={chartSeries} labels={chartLabels} />
        ) : (
          <p className="text-xs text-gray-400 text-center py-10">
            Aucune donnée sur la période.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Entonnoir de conversion</h3>
              <p className="text-[11px] text-gray-400">Répartition par statut (global)</p>
            </div>
          </div>

          {funnel.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Aucune donnée.</p>
          ) : (
            <div className="space-y-2.5">
              {funnel
                .slice()
                .sort((a, b) => toNumber(b.total) - toNumber(a.total))
                .map((row) => {
                  const meta = statusMeta(row.statut)
                  const total = toNumber(row.total)
                  return (
                    <div key={row.statut}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-medium text-gray-700">{meta.label}</span>
                        <span className="font-bold text-gray-900 tabular-nums">
                          {total.toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(2, (total / funnelMax) * 100)}%`,
                            backgroundColor: meta.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Sources */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Performance des sources</h3>
              <p className="text-[11px] text-gray-400">Leads, RDV et taux de conversion</p>
            </div>
          </div>

          {sources.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Aucune donnée.</p>
          ) : (
            <div className="space-y-3">
              {sources.map((s) => {
                const leads = toNumber(s.leads)
                return (
                  <div key={s.source}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-medium text-gray-700 truncate max-w-[55%]">
                        {s.source}
                      </span>
                      <span className="text-gray-500">
                        {leads} leads ·{' '}
                        <span className="font-semibold text-emerald-600">
                          {toNumber(s.taux_rdv).toFixed(1)}% RDV
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(2, (leads / sourceMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Agents */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Performance des agents CRC</h3>
          <p className="text-[11px] text-gray-400">30 derniers jours</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Agent</th>
                <th className="px-4 py-2.5 font-semibold">Appels</th>
                <th className="px-4 py-2.5 font-semibold">RDV pris</th>
                <th className="px-4 py-2.5 font-semibold">Leads traités</th>
                <th className="px-4 py-2.5 font-semibold">Taux RDV</th>
                <th className="px-4 py-2.5 font-semibold w-40">Activité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agents.map((agent, i) => {
                const appels = toNumber(agent.appels)
                const rdv = toNumber(agent.rdv_pris)
                const taux = appels > 0 ? (rdv / appels) * 100 : 0
                return (
                  <tr key={agent.id ?? agent.agent ?? i} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-semibold text-gray-900">{agent.agent}</td>
                    <td className="px-4 py-3 text-gray-700">{appels}</td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">{rdv}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {toNumber(agent.leads_traites)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {taux.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.max(2, (appels / agentMax) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Aucune donnée agent.
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