'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Phone,
  CheckCircle2,
  Clock,
  Calendar,
  MessageCircle,
  Play,
  ShieldAlert,
  Loader2,
  ChevronDown,
  User,
  Tag,
  MapPin,
  Banknote,
} from 'lucide-react'
import { formatTelephone, formatMontant, formatTimeAgo, makeTelLink } from '@/lib/utils'
import { fetchNextLeadForAgent, logCallAndDisposition, startVoipCall } from '@/features/calls/actions'
import { lockLeadForAgent } from '@/features/leads/actions'

export interface QueueLead {
  id: string
  nom: string
  prenom?: string | null
  telephone: string
  ville?: string | null
  statut?: string | null
  interet_produit?: string | null
  budget?: number | null
  delai_achat?: string | null
  nb_tentatives_appel?: number | null
  created_at?: string | null
  source?: { nom: string } | null
  site_prefere?: { nom: string; ville?: string | null } | null
  __demo?: boolean
}

export interface Disposition {
  id: string
  libelle: string
  type: string
  action: string
  action_params: Record<string, unknown>
  couleur: string
  ordre: number
}

export interface ScriptContent {
  accroche?: string
  questions_qualification?: string[]
  objections?: { objection: string; reponse: string }[]
  closing_rdv?: string
}

interface Props {
  initialLead: QueueLead | null
  initialReason: string
  dispositions: Disposition[]
  script: ScriptContent
  demoQueue?: QueueLead[]
}

const DELAIS = ['Immédiat (< 1 mois)', '1 à 3 mois', '3 à 6 mois', 'Plus tard']

function renderTemplate(text: string | undefined, lead: QueueLead | null): string {
  if (!text || !lead) return text ?? ''
  return text
    .replace(/\{\{\s*nom\s*\}\}/g, `M. ${lead.nom}`)
    .replace(/\{\{\s*produit\s*\}\}/g, lead.interet_produit ?? 'notre gamme')
    .replace(/\{\{\s*site\s*\}\}/g, lead.site_prefere?.nom ?? 'notre showroom')
    .replace(/\{\{\s*agent_prenom\s*\}\}/g, 'votre conseiller')
}

function formatChrono(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function CallQueueView({
  initialLead,
  initialReason,
  dispositions,
  script,
  demoQueue = [],
}: Props) {
  const [lead, setLead] = useState<QueueLead | null>(initialLead)
  const [reason, setReason] = useState(initialReason)
  const [selectedDisposition, setSelectedDisposition] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [callStarted, setCallStarted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [voipLoading, setVoipLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showObjections, setShowObjections] = useState(false)
  const [showRappel, setShowRappel] = useState(false)

  const [qualification, setQualification] = useState({
    budget: '',
    delai_achat: '',
    reprise_vehicule: '',
    financement: '',
    modele_actuel: '',
    besoin_details: '',
  })
  const [rappel, setRappel] = useState({ date: '', heure: '', note: '' })

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isDemo = Boolean(lead?.__demo)
  const selected = useMemo(
    () => dispositions.find((d) => d.id === selectedDisposition) ?? null,
    [dispositions, selectedDisposition]
  )

  useEffect(() => {
    if (!lead || lead.__demo) return
    let cancelled = false
    lockLeadForAgent(lead.id).then((res: any) => {
      if (!cancelled && res && res.success === false) {
        setError(res.error ?? 'Impossible de verrouiller ce lead.')
      }
    })
    return () => {
      cancelled = true
    }
  }, [lead])

  useEffect(() => {
    if (!callStarted) return
    tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [callStarted])

  function resetCallState() {
    setSelectedDisposition(null)
    setNotes('')
    setElapsed(0)
    setCallStarted(false)
    setQualification({
      budget: '',
      delai_achat: '',
      reprise_vehicule: '',
      financement: '',
      modele_actuel: '',
      besoin_details: '',
    })
    setRappel({ date: '', heure: '', note: '' })
    setShowRappel(false)
    setShowObjections(false)
  }

  function nextDemoLead(currentId: string | undefined): QueueLead | null {
    if (demoQueue.length === 0) return null
    const index = demoQueue.findIndex((l) => l.id === currentId)
    return demoQueue[(index + 1) % demoQueue.length]
  }

  async function handleNext() {
    if (!lead) return
    if (!selectedDisposition) {
      setError('Sélectionnez une disposition pour clôturer l’appel.')
      return
    }

    setError(null)
    setSuccess(null)

    if (isDemo) {
      setSuccess('Appel enregistré (mode démo). Prochain prospect chargé.')
      resetCallState()
      setLead(nextDemoLead(lead.id))
      setReason('File de démonstration CRC')
      return
    }

    setSaving(true)

    const reponses: Record<string, unknown> = {}
    if (qualification.budget) reponses.budget = Number(qualification.budget)
    if (qualification.delai_achat) reponses.delai_achat = qualification.delai_achat
    if (qualification.reprise_vehicule) reponses.reprise_vehicule = qualification.reprise_vehicule === 'oui'
    if (qualification.financement) reponses.financement = qualification.financement === 'credit'
    if (qualification.modele_actuel) reponses.modele_actuel = qualification.modele_actuel
    if (qualification.besoin_details) reponses.besoin_details = qualification.besoin_details

    const res = await logCallAndDisposition({
      lead_id: lead.id,
      disposition_id: selectedDisposition,
      notes: notes || undefined,
      duree_secondes: elapsed || 30,
      reponses_qualification: Object.keys(reponses).length > 0 ? (reponses as any) : undefined,
      rappel_date: showRappel && rappel.date ? rappel.date : undefined,
      rappel_heure: showRappel && rappel.heure ? rappel.heure : undefined,
      rappel_note: showRappel ? rappel.note || undefined : undefined,
    })

    if (!res.success) {
      setSaving(false)
      setError(res.error ?? 'Impossible d’enregistrer l’appel.')
      return
    }

    resetCallState()
    const next = await fetchNextLeadForAgent()
    setSaving(false)
    setLead((next.lead as QueueLead | null) ?? null)
    setReason(next.reason)
    setSuccess('Appel enregistré. Prochain prospect chargé.')
  }

  async function handleVoip() {
    if (!lead) return
    setError(null)
    setSuccess(null)
    setVoipLoading(true)

    if (isDemo) {
      setCallStarted(true)
      setVoipLoading(false)
      setSuccess('Appel VoIP simulé (mode démo) — chronomètre démarré.')
      return
    }

    const res = await startVoipCall(lead.id)
    setVoipLoading(false)

    if (!res.success) {
      setError(res.error ?? 'Appel VoIP impossible.')
      return
    }

    setCallStarted(true)
    setSuccess('Appel VoIP initié — chronomètre démarré.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ma file d&apos;appels CRC</h2>
          <p className="text-sm text-gray-500">
            Priorité : nouveaux leads &gt; rappels programmés &gt; relances de cadence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            ● Agent en ligne (Prêt pour appel)
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {!lead ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900">Aucun prospect en attente</h3>
          <p className="text-xs text-gray-500 mt-1">{reason}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-brand-100 text-brand-800 uppercase tracking-wider">
                  {isDemo ? 'Mode démonstration' : 'Lead verrouillé pour vous (30 min)'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTimeAgo(lead.created_at)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {lead.prenom} {lead.nom}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {reason} • {lead.source?.nom ?? 'Source directe'}
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Téléphone
                </span>
                <span className="font-mono font-medium text-gray-900">{formatTelephone(lead.telephone)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Intérêt
                </span>
                <span className="font-medium text-gray-900">{lead.interet_produit ?? 'Non précisé'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" /> Budget
                </span>
                <span className="font-medium text-gray-900">{formatMontant(lead.budget)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Ville / site
                </span>
                <span className="font-medium text-gray-900 text-right">
                  {lead.ville ?? '—'}
                  {lead.site_prefere?.nom ? ` (${lead.site_prefere.nom})` : ''}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Tentatives
                </span>
                <span className="font-medium text-gray-900">{lead.nb_tentatives_appel ?? 0}</span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={makeTelLink(lead.telephone)}
                onClick={() => setCallStarted(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-colors text-base"
              >
                {callStarted ? <Clock className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                {callStarted ? `Appel en cours — ${formatChrono(elapsed)}` : 'Lancer l’appel'}
              </a>
              <button
                type="button"
                onClick={handleVoip}
                disabled={voipLoading}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-700 font-medium rounded-xl transition-colors text-xs"
              >
                {voipLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Phone className="w-3.5 h-3.5" />
                )}
                Appeler via VoIP (Twilio)
              </button>
              <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
                <span>Chronomètre démarré au clic sur le numéro</span>
                {callStarted && (
                  <button
                    type="button"
                    onClick={() => setCallStarted(false)}
                    className="text-gray-500 hover:text-gray-800 underline"
                  >
                    Arrêter
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Script de qualification</h3>
              <span className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded">Dynamique</span>
            </div>

            {script.accroche && (
              <div className="p-3 bg-brand-50/70 rounded-lg border border-brand-100 text-xs">
                <p className="font-semibold text-brand-950 mb-1">Accroche conseillée</p>
                <p className="text-brand-900 italic">{renderTemplate(script.accroche, lead)}</p>
              </div>
            )}

            {script.questions_qualification && script.questions_qualification.length > 0 && (
              <div className="text-xs">
                <p className="font-semibold text-gray-700 mb-2">Questions de qualification</p>
                <ul className="space-y-1.5">
                  {script.questions_qualification.map((q, i) => (
                    <li key={i} className="flex gap-2 text-gray-600">
                      <span className="text-brand-500 font-bold">{i + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {script.objections && script.objections.length > 0 && (
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowObjections((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-700"
                >
                  Traiter les objections ({script.objections.length})
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showObjections ? 'rotate-180' : ''}`} />
                </button>
                {showObjections && (
                  <div className="p-3 space-y-3">
                    {script.objections.map((o, i) => (
                      <div key={i} className="text-[11px]">
                        <p className="font-semibold text-gray-800">« {o.objection} »</p>
                        <p className="text-gray-600 mt-0.5">{o.reponse}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 space-y-3 text-xs">
              <p className="font-semibold text-gray-800">Qualification en direct</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Délai d&apos;achat</label>
                  <select
                    value={qualification.delai_achat}
                    onChange={(e) => setQualification({ ...qualification, delai_achat: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="">Non renseigné</option>
                    {DELAIS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Budget (MAD)</label>
                  <input
                    type="number"
                    value={qualification.budget}
                    onChange={(e) => setQualification({ ...qualification, budget: e.target.value })}
                    placeholder={lead.budget ? String(lead.budget) : '280000'}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Reprise véhicule</label>
                  <div className="flex gap-3 pt-1">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="reprise"
                        checked={qualification.reprise_vehicule === 'oui'}
                        onChange={() => setQualification({ ...qualification, reprise_vehicule: 'oui' })}
                      />
                      Oui
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="reprise"
                        checked={qualification.reprise_vehicule === 'non'}
                        onChange={() => setQualification({ ...qualification, reprise_vehicule: 'non' })}
                      />
                      Non
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Financement</label>
                  <div className="flex gap-3 pt-1">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="financement"
                        checked={qualification.financement === 'credit'}
                        onChange={() => setQualification({ ...qualification, financement: 'credit' })}
                      />
                      Crédit/LOA
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="financement"
                        checked={qualification.financement === 'comptant'}
                        onChange={() => setQualification({ ...qualification, financement: 'comptant' })}
                      />
                      Comptant
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Modèle actuel (reprise)</label>
                <input
                  type="text"
                  value={qualification.modele_actuel}
                  onChange={(e) => setQualification({ ...qualification, modele_actuel: e.target.value })}
                  placeholder="Ex: Dacia Duster 2019, 85 000 km"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Besoin / précisions</label>
                <textarea
                  rows={2}
                  value={qualification.besoin_details}
                  onChange={(e) => setQualification({ ...qualification, besoin_details: e.target.value })}
                  placeholder="Finition souhaitée, couleur, contraintes..."
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-semibold text-gray-900">Issue de l&apos;appel</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Choisir une disposition pour déverrouiller le prospect suivant
              </p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {dispositions.map((d) => {
                const active = selectedDisposition === d.id
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDisposition(d.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors ${
                      active ? 'ring-2 ring-offset-1' : 'hover:bg-gray-50'
                    }`}
                    style={{
                      borderColor: active ? d.couleur : '#E5E7EB',
                      color: active ? d.couleur : '#374151',
                      backgroundColor: active ? `${d.couleur}12` : undefined,
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.couleur }} />
                      {d.libelle}
                    </span>
                    {active && <CheckCircle2 className="w-4 h-4" style={{ color: d.couleur }} />}
                  </button>
                )
              })}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes d&apos;appel</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Attentes du client, modèle précis, contraintes d’horaires..."
                className="w-full p-2.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="border border-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setShowRappel((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Programmer un rappel
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRappel ? 'rotate-180' : ''}`} />
              </button>
              {showRappel && (
                <div className="p-3 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={rappel.date}
                      onChange={(e) => setRappel({ ...rappel, date: e.target.value })}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                    <input
                      type="time"
                      value={rappel.heure}
                      onChange={(e) => setRappel({ ...rappel, heure: e.target.value })}
                      className="px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    value={rappel.note}
                    onChange={(e) => setRappel({ ...rappel, note: e.target.value })}
                    placeholder="Motif du rappel"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {selected?.action === 'creer_rdv' && (
              <div className="p-3 bg-brand-50 border border-brand-100 rounded-lg text-[11px] text-brand-800 flex gap-2">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>
                  Disposition RDV : pensez à planifier le créneau showroom depuis la fiche lead après l’appel.
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={saving || !selectedDisposition}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-medium text-xs rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {saving ? 'Enregistrement…' : 'Enregistrer & prospect suivant'}
            </button>

            <a
              href={`/leads/${lead.id}`}
              className="w-full py-2 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-2 hover:bg-gray-50"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Ouvrir la fiche complète
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
