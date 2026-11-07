'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Pencil, Loader2 } from 'lucide-react'
import { updateLead } from '@/features/leads/actions'
import { LEAD_STATUSES } from '@/lib/constants'

interface LeadData {
  id: string
  nom: string
  prenom?: string | null
  telephone: string
  email?: string | null
  ville?: string | null
  source_id?: string | null
  site_prefere_id?: string | null
  interet_produit?: string | null
  budget?: number | null
  delai_achat?: string | null
  financement?: boolean | null
  reprise_vehicule?: boolean | null
  notes?: string | null
  statut?: string | null
  perdu_raison?: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  lead: LeadData
  sources?: { id: string; nom: string }[]
  sites?: { id: string; nom: string; ville: string }[]
}

const DELAIS = ['Immédiat (< 1 mois)', '1 à 3 mois', '3 à 6 mois', 'Plus tard']

export default function LeadEditModal({ isOpen, onClose, lead, sources = [], sites = [] }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nom: lead.nom ?? '',
    prenom: lead.prenom ?? '',
    telephone: lead.telephone ?? '',
    email: lead.email ?? '',
    ville: lead.ville ?? '',
    source_id: lead.source_id ?? '',
    site_prefere_id: lead.site_prefere_id ?? '',
    interet_produit: lead.interet_produit ?? '',
    budget: lead.budget ? String(lead.budget) : '',
    delai_achat: lead.delai_achat ?? '',
    financement: Boolean(lead.financement),
    reprise_vehicule: Boolean(lead.reprise_vehicule),
    notes: lead.notes ?? '',
    statut: lead.statut ?? 'nouveau',
    perdu_raison: lead.perdu_raison ?? '',
  })

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await updateLead({
      id: lead.id,
      nom: form.nom,
      prenom: form.prenom || null,
      telephone: form.telephone,
      email: form.email || null,
      ville: form.ville || null,
      source_id: form.source_id || null,
      site_prefere_id: form.site_prefere_id || null,
      interet_produit: form.interet_produit || null,
      budget: form.budget ? Number(form.budget) : null,
      delai_achat: form.delai_achat || null,
      financement: form.financement,
      reprise_vehicule: form.reprise_vehicule,
      notes: form.notes || null,
      statut: form.statut,
      perdu_raison: form.statut === 'perdu' ? form.perdu_raison || null : null,
    })

    setLoading(false)

    if (!res.success) {
      setError(res.error ?? 'Impossible d’enregistrer les modifications.')
      return
    }

    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Modifier le prospect</h3>
              <p className="text-xs text-gray-400">Mise à jour de la fiche et du pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone *</label>
              <input
                type="tel"
                required
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ville</label>
              <input
                type="text"
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Statut</label>
              <select
                value={form.statut}
                onChange={(e) => setForm({ ...form, statut: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.statut === 'perdu' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Motif de perte</label>
              <input
                type="text"
                value={form.perdu_raison}
                onChange={(e) => setForm({ ...form, perdu_raison: e.target.value })}
                placeholder="Budget insuffisant, achat concurrent, projet reporté..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Source</label>
              <select
                value={form.source_id}
                onChange={(e) => setForm({ ...form, source_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">Non renseignée</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Showroom préféré</label>
              <select
                value={form.site_prefere_id}
                onChange={(e) => setForm({ ...form, site_prefere_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">Non assigné</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.nom} ({s.ville})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Modèle / intérêt</label>
              <input
                type="text"
                value={form.interet_produit}
                onChange={(e) => setForm({ ...form, interet_produit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Budget (MAD)</label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Délai d&apos;achat</label>
            <select
              value={form.delai_achat}
              onChange={(e) => setForm({ ...form, delai_achat: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">Non qualifié</option>
              {DELAIS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-6 pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.financement}
                onChange={(e) => setForm({ ...form, financement: e.target.checked })}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-gray-700">Demande de financement</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.reprise_vehicule}
                onChange={(e) => setForm({ ...form, reprise_vehicule: e.target.checked })}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-gray-700">Reprise véhicule</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-lg text-xs font-medium shadow-sm inline-flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
