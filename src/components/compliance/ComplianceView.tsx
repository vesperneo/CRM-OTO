'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Printer,
  Save,
  ShieldCheck,
  Trash2,
  UserX,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  addDncEntry,
  anonymizeLead,
  createDataRequest,
  removeDncEntry,
  updateDataRequest,
  updateRetentionPolicy,
  type RetentionPolicy,
} from '@/features/compliance/actions'
import { downloadCsv, downloadExcel, printReport, todaySlug } from '@/lib/export'
import { normaliserTelephone } from '@/lib/utils'

export interface DataRequestRow {
  id: string
  lead_id?: string | null
  type: string
  statut: string
  demandeur_nom: string
  demandeur_contact: string
  motif?: string | null
  reponse?: string | null
  created_at: string
  traite_le?: string | null
  lead?: { nom: string; prenom?: string | null; telephone: string } | null
  __demo?: boolean
}

export interface DncRow {
  telephone: string
  telephone_normalise: string
  raison?: string | null
  date_ajout: string
  __demo?: boolean
}

export interface AuditRow {
  id: number | string
  table_name: string
  record_id: string
  operation: string
  created_at: string
  auteur?: { nom: string; prenom?: string | null } | null
}

export interface ComplianceStats {
  leadsTotal: number
  consentCount: number
  consentRate: number
  dncCount: number
  pendingRequests: number
}

export interface LeadOptionLite {
  id: string
  nom: string
  prenom?: string | null
  telephone: string
}

interface Props {
  stats: ComplianceStats
  dataRequests: DataRequestRow[]
  dncEntries: DncRow[]
  auditLogs: AuditRow[]
  leads: LeadOptionLite[]
  policy: RetentionPolicy
  isDemo?: boolean
}

type Tab = 'overview' | 'requests' | 'dnc' | 'retention'

const REQUEST_TYPES: Record<string, string> = {
  acces: 'Accès',
  rectification: 'Rectification',
  effacement: 'Effacement',
  opposition: 'Opposition',
}

const REQUEST_STATUS: Record<string, { label: string; color: string }> = {
  nouvelle: { label: 'Nouvelle', color: 'bg-amber-100 text-amber-800' },
  en_cours: { label: 'En cours', color: 'bg-brand-100 text-brand-800' },
  traitee: { label: 'Traitée', color: 'bg-emerald-100 text-emerald-800' },
  refusee: { label: 'Refusée', color: 'bg-red-100 text-red-800' },
}

function requestTypeLabel(type: string) {
  return REQUEST_TYPES[type] ?? type
}

function requestStatus(statut: string) {
  return REQUEST_STATUS[statut] ?? { label: statut, color: 'bg-gray-100 text-gray-700' }
}

export default function ComplianceView({
  stats,
  dataRequests,
  dncEntries,
  auditLogs,
  leads,
  policy,
  isDemo,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [requests, setRequests] = useState(dataRequests)
  const [dnc, setDnc] = useState(dncEntries)
  const [currentPolicy, setCurrentPolicy] = useState(policy)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [newRequestOpen, setNewRequestOpen] = useState(false)
  const [newType, setNewType] = useState('acces')
  const [newNom, setNewNom] = useState('')
  const [newContact, setNewContact] = useState('')
  const [newLeadId, setNewLeadId] = useState('')
  const [newMotif, setNewMotif] = useState('')

  const [selectedRequest, setSelectedRequest] = useState<DataRequestRow | null>(null)
  const [responseText, setResponseText] = useState('')

  const [dncPhone, setDncPhone] = useState('')
  const [dncReason, setDncReason] = useState('')

  const [anonymizeLeadId, setAnonymizeLeadId] = useState('')
  const [anonymizeMotif, setAnonymizeMotif] = useState('')

  useEffect(() => {
    setRequests(dataRequests)
  }, [dataRequests])

  useEffect(() => {
    setDnc(dncEntries)
  }, [dncEntries])

  useEffect(() => {
    setCurrentPolicy(policy)
  }, [policy])

  const pendingCount = useMemo(
    () => requests.filter((r) => r.statut === 'nouvelle' || r.statut === 'en_cours').length,
    [requests]
  )

  function flash(text: string) {
    setMessage(text)
    setError(null)
    setTimeout(() => setMessage(null), 4000)
  }

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!newNom.trim() || !newContact.trim()) {
      setError('Nom et contact du demandeur requis.')
      return
    }

    setBusy(true)

    if (isDemo) {
      setRequests((prev) => [
        {
          id: `demo-req-${Date.now()}`,
          lead_id: newLeadId || null,
          type: newType,
          statut: 'nouvelle',
          demandeur_nom: newNom,
          demandeur_contact: newContact,
          motif: newMotif,
          created_at: new Date().toISOString(),
          lead: leads.find((l) => l.id === newLeadId) ?? null,
          __demo: true,
        },
        ...prev,
      ])
      setBusy(false)
      setNewRequestOpen(false)
      setNewNom('')
      setNewContact('')
      setNewLeadId('')
      setNewMotif('')
      flash('Demande enregistrée (démonstration).')
      return
    }

    const res = await createDataRequest({
      lead_id: newLeadId || null,
      type: newType as 'acces' | 'rectification' | 'effacement' | 'opposition',
      demandeur_nom: newNom,
      demandeur_contact: newContact,
      motif: newMotif,
    })

    setBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Création impossible')
      return
    }

    setNewRequestOpen(false)
    setNewNom('')
    setNewContact('')
    setNewLeadId('')
    setNewMotif('')
    flash('Demande de droits enregistrée.')
    router.refresh()
  }

  async function handleUpdateRequest(
    request: DataRequestRow,
    statut: 'nouvelle' | 'en_cours' | 'traitee' | 'refusee',
    reponse?: string
  ) {
    setError(null)
    setBusy(true)

    if (request.__demo) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? {
                ...r,
                statut,
                reponse: reponse ?? r.reponse,
                traite_le: statut === 'traitee' ? new Date().toISOString() : r.traite_le,
              }
            : r
        )
      )
      setBusy(false)
      setSelectedRequest(null)
      setResponseText('')
      flash('Statut de la demande mis à jour (démonstration).')
      return
    }

    const res = await updateDataRequest(request.id, statut, reponse)
    setBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Mise à jour impossible')
      return
    }

    setSelectedRequest(null)
    setResponseText('')
    flash('Demande mise à jour.')
    router.refresh()
  }

  async function handleAddDnc(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!dncPhone.trim()) {
      setError('Numéro de téléphone requis.')
      return
    }

    setBusy(true)

    if (isDemo) {
      setDnc((prev) => [
        {
          telephone: dncPhone.trim(),
          telephone_normalise: normaliserTelephone(dncPhone),
          raison: dncReason || 'Opposition au démarchage',
          date_ajout: new Date().toISOString(),
          __demo: true,
        },
        ...prev,
      ])
      setBusy(false)
      setDncPhone('')
      setDncReason('')
      flash('Numéro ajouté à la liste DNC (démonstration).')
      return
    }

    const res = await addDncEntry(dncPhone, dncReason)
    setBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Ajout impossible')
      return
    }
    setDncPhone('')
    setDncReason('')
    flash('Numéro ajouté à la liste « ne pas appeler ».')
    router.refresh()
  }

  async function handleRemoveDnc(telephone: string) {
    setError(null)
    setBusy(true)

    if (isDemo) {
      setDnc((prev) => prev.filter((d) => d.telephone !== telephone))
      setBusy(false)
      flash('Numéro retiré de la liste DNC (démonstration).')
      return
    }

    const res = await removeDncEntry(telephone)
    setBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Suppression impossible')
      return
    }
    flash('Numéro retiré de la liste DNC.')
    router.refresh()
  }

  async function handleSavePolicy() {
    setError(null)
    setBusy(true)

    if (isDemo) {
      setBusy(false)
      flash('Politique de rétention enregistrée (démonstration).')
      return
    }

    const res = await updateRetentionPolicy(currentPolicy)
    setBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Enregistrement impossible')
      return
    }
    flash('Politique de rétention mise à jour.')
    router.refresh()
  }

  async function handleAnonymize() {
    if (!anonymizeLeadId) {
      setError('Sélectionnez un lead à anonymiser.')
      return
    }
    if (
      !window.confirm(
        'Anonymiser définitivement les données personnelles de ce lead (nom, téléphone, email, notes) ?'
      )
    ) {
      return
    }

    setError(null)
    setBusy(true)

    if (isDemo) {
      setBusy(false)
      flash('Anonymisation simulée (démonstration).')
      setAnonymizeLeadId('')
      setAnonymizeMotif('')
      return
    }

    const res = await anonymizeLead(anonymizeLeadId, anonymizeMotif)
    setBusy(false)
    if (!res.success) {
      setError(res.error ?? 'Anonymisation impossible')
      return
    }
    setAnonymizeLeadId('')
    setAnonymizeMotif('')
    flash('Lead anonymisé. Les données personnelles ont été effacées.')
    router.refresh()
  }

  const requestHeaders = ['Type', 'Demandeur', 'Contact', 'Lead', 'Statut', 'Date']
  const requestRows = () =>
    requests.map((r) => [
      requestTypeLabel(r.type),
      r.demandeur_nom,
      r.demandeur_contact,
      r.lead ? `${r.lead.prenom ?? ''} ${r.lead.nom}`.trim() : '',
      requestStatus(r.statut).label,
      format(new Date(r.created_at), 'dd/MM/yyyy HH:mm'),
    ])

  const dncHeaders = ['Téléphone', 'Normalisé', 'Raison', 'Date ajout']
  const dncRows = () =>
    dnc.map((d) => [
      d.telephone,
      d.telephone_normalise,
      d.raison ?? '',
      format(new Date(d.date_ajout), 'dd/MM/yyyy HH:mm'),
    ])

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Conformité & CNDP</h2>
          <p className="text-sm text-gray-500">
            Consentements, droits des personnes, DNC, rétention et traçabilité
          </p>
        </div>
        <button
          onClick={() => setNewRequestOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg shadow-sm"
        >
          <FileText className="w-4 h-4" />
          Nouvelle demande
        </button>
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
              <AlertTriangle className="w-4 h-4" />
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

      <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 overflow-x-auto">
        {[
          { key: 'overview' as Tab, label: 'Vue d’ensemble', icon: ShieldCheck },
          { key: 'requests' as Tab, label: `Demandes (${pendingCount})`, icon: FileText },
          { key: 'dnc' as Tab, label: `DNC (${dnc.length})`, icon: UserX },
          { key: 'retention' as Tab, label: 'Rétention & audit', icon: Lock },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.key === 'overview' && isDemo ? (
              <span className="ml-1 text-[9px] font-bold uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                Démo
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Leads consentants', value: `${stats.consentCount} / ${stats.leadsTotal}`, note: `${stats.consentRate.toFixed(1)}% de consentement`, tint: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
              { label: 'Demandes en cours', value: pendingCount, note: 'Délai CNDP : 30 jours', tint: 'text-amber-600 bg-amber-50', icon: FileText },
              { label: 'Liste DNC', value: dnc.length, note: 'Oppositions au démarchage', tint: 'text-red-600 bg-red-50', icon: UserX },
              { label: 'Rétention leads', value: `${currentPolicy.retention_leads_mois} mois`, note: `Appels : ${currentPolicy.retention_appels_mois} mois`, tint: 'text-brand-600 bg-brand-50', icon: Lock },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
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

          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold text-brand-900">
                  Déclaration CNDP — Loi 09-08
                </p>
                <p className="text-brand-700 mt-0.5 leading-relaxed">
                  Les traitements de données personnelles du CRM Otoclic (prospection,
                  gestion des rendez-vous, enregistrements d’appels) doivent être déclarés
                  auprès de la CNDP. Conservez le récépissé de déclaration et le registre
                  des traitements. Délai de réponse aux demandes de droits : 30 jours.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-1">
                Dernières demandes de droits
              </h3>
              <p className="text-[11px] text-gray-400 mb-3">
                Accès, rectification, effacement, opposition
              </p>
              {requests.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  Aucune demande enregistrée.
                </p>
              ) : (
                <div className="space-y-2">
                  {requests.slice(0, 5).map((r) => {
                    const st = requestStatus(r.statut)
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSelectedRequest(r)
                          setResponseText(r.reponse ?? '')
                        }}
                        className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-left"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {requestTypeLabel(r.type)} — {r.demandeur_nom}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {format(new Date(r.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-1">
                Anonymisation (droit à l’effacement)
              </h3>
              <p className="text-[11px] text-gray-400 mb-3">
                Supprime les données personnelles tout en conservant les statistiques.
              </p>
              <div className="space-y-2.5">
                <select
                  value={anonymizeLeadId}
                  onChange={(e) => setAnonymizeLeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="">Sélectionner un lead…</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {[lead.prenom, lead.nom].filter(Boolean).join(' ')} — {lead.telephone}
                    </option>
                  ))}
                </select>
                <input
                  value={anonymizeMotif}
                  onChange={(e) => setAnonymizeMotif(e.target.value)}
                  placeholder="Motif (ex. demande d’effacement du 12/05)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
                <button
                  onClick={handleAnonymize}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-semibold rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Anonymiser le lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Demandes de droits</h3>
              <p className="text-[11px] text-gray-400">
                Délai de traitement recommandé : 30 jours
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  downloadCsv(`demandes-cndp-${todaySlug()}`, requestHeaders, requestRows())
                }
                title="Exporter CSV"
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  downloadExcel(
                    `demandes-cndp-${todaySlug()}`,
                    'Demandes de droits CNDP',
                    requestHeaders,
                    requestRows()
                  )
                }
                title="Exporter Excel"
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  printReport('Demandes de droits CNDP', requestHeaders, requestRows())
                }
                title="Imprimer"
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {requests.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">
              Aucune demande enregistrée.
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {requests.map((r) => {
                const st = requestStatus(r.statut)
                return (
                  <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-gray-900">
                          {requestTypeLabel(r.type)} — {r.demandeur_nom}
                        </p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {r.demandeur_contact}
                        {r.lead ? ` · Lead : ${r.lead.prenom ?? ''} ${r.lead.nom}`.trim() : ''}
                      </p>
                      {r.motif && (
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                          {r.motif}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">
                        {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm')}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedRequest(r)
                          setResponseText(r.reponse ?? '')
                        }}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Traiter
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'dnc' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 h-fit">
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Ajouter un numéro
            </h3>
            <p className="text-[11px] text-gray-400 mb-3">
              Opposition au démarchage téléphonique.
            </p>
            <form onSubmit={handleAddDnc} className="space-y-2.5">
              <input
                value={dncPhone}
                onChange={(e) => setDncPhone(e.target.value)}
                placeholder="+212 6XX XXXXXX"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <input
                value={dncReason}
                onChange={(e) => setDncReason(e.target.value)}
                placeholder="Raison (optionnel)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white text-xs font-semibold rounded-lg"
              >
                <UserX className="w-3.5 h-3.5" />
                Ajouter à la liste DNC
              </button>
            </form>
            <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
              Les leads dont le numéro correspond seront automatiquement passés en
              « Ne pas rappeler ».
            </p>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                Liste « Ne pas appeler » ({dnc.length})
              </h3>
              <button
                onClick={() =>
                  downloadCsv(`dnc-${todaySlug()}`, dncHeaders, dncRows())
                }
                title="Exporter CSV"
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
            {dnc.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-10">
                Aucun numéro dans la liste DNC.
              </p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                {dnc.map((d) => (
                  <div key={d.telephone} className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900">{d.telephone}</p>
                      <p className="text-[10px] text-gray-400">
                        {d.raison ?? 'Opposition au démarchage'} ·{' '}
                        {format(new Date(d.date_ajout), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveDnc(d.telephone)}
                      disabled={busy}
                      title="Retirer de la liste"
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'retention' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Politique de rétention</h3>
            <p className="text-[11px] text-gray-400 mb-4">
              Durées de conservation des données personnelles.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Leads (mois)
                </label>
                <input
                  type="number"
                  min={1}
                  value={currentPolicy.retention_leads_mois}
                  onChange={(e) =>
                    setCurrentPolicy((p) => ({
                      ...p,
                      retention_leads_mois: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Appels (mois)
                </label>
                <input
                  type="number"
                  min={1}
                  value={currentPolicy.retention_appels_mois}
                  onChange={(e) =>
                    setCurrentPolicy((p) => ({
                      ...p,
                      retention_appels_mois: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Journal d’audit (mois)
                </label>
                <input
                  type="number"
                  min={1}
                  value={currentPolicy.retenion_audit_mois}
                  onChange={(e) =>
                    setCurrentPolicy((p) => ({
                      ...p,
                      retenion_audit_mois: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Responsable du traitement
                </label>
                <input
                  value={currentPolicy.responsable}
                  onChange={(e) =>
                    setCurrentPolicy((p) => ({ ...p, responsable: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleSavePolicy}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-xs font-semibold rounded-lg"
              >
                <Save className="w-3.5 h-3.5" />
                Enregistrer la politique
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Journal d’audit</h3>
              <p className="text-[11px] text-gray-400">
                15 dernières opérations sensibles
              </p>
            </div>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-10">
                Aucune entrée d’audit.
              </p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[460px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-gray-800">
                        {log.operation} · {log.table_name}
                      </p>
                      <span className="text-[10px] text-gray-400">
                        {format(new Date(log.created_at), 'dd/MM HH:mm')}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {log.auteur
                        ? `${log.auteur.prenom ?? ''} ${log.auteur.nom}`.trim()
                        : 'Système'}{' '}
                      · {log.record_id.slice(0, 8)}…
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modale nouvelle demande */}
      {newRequestOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Nouvelle demande de droits</h3>
                <p className="text-xs text-gray-400">CNDP / RGPD — loi 09-08</p>
              </div>
              <button
                onClick={() => setNewRequestOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3 pt-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Type de demande
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  {Object.entries(REQUEST_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Nom du demandeur *
                </label>
                <input
                  value={newNom}
                  onChange={(e) => setNewNom(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Contact (email ou téléphone) *
                </label>
                <input
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Lead concerné
                </label>
                <select
                  value={newLeadId}
                  onChange={(e) => setNewLeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="">Aucun / non précisé</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {[lead.prenom, lead.nom].filter(Boolean).join(' ')} — {lead.telephone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Motif / précisions
                </label>
                <textarea
                  rows={2}
                  value={newMotif}
                  onChange={(e) => setNewMotif(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setNewRequestOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-lg text-xs font-semibold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale traitement demande */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {requestTypeLabel(selectedRequest.type)} — {selectedRequest.demandeur_nom}
                </h3>
                <p className="text-xs text-gray-400">{selectedRequest.demandeur_contact}</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Statut</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    requestStatus(selectedRequest.statut).color
                  }`}
                >
                  {requestStatus(selectedRequest.statut).label}
                </span>
              </div>
              {selectedRequest.motif && (
                <div>
                  <p className="text-gray-500 mb-1">Motif</p>
                  <p className="bg-gray-50 rounded-lg p-2.5 text-gray-700 leading-relaxed">
                    {selectedRequest.motif}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Réponse / conclusion
                </label>
                <textarea
                  rows={3}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Décrivez les actions réalisées et la réponse envoyée au demandeur…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => handleUpdateRequest(selectedRequest, 'en_cours', responseText)}
                disabled={busy}
                className="px-3 py-2 border border-brand-200 text-brand-700 hover:bg-brand-50 rounded-lg text-xs font-semibold"
              >
                En cours
              </button>
              <button
                onClick={() => handleUpdateRequest(selectedRequest, 'traitee', responseText)}
                disabled={busy}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg text-xs font-semibold"
              >
                Marquer traitée
              </button>
              <button
                onClick={() => handleUpdateRequest(selectedRequest, 'refusee', responseText)}
                disabled={busy}
                className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold"
              >
                Refuser
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-3 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}