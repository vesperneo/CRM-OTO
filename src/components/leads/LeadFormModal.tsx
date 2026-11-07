'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, User, Phone, Mail, Building, MapPin, Tag, Megaphone } from 'lucide-react'
import { createLead } from '@/features/leads/actions'

interface Props {
  isOpen: boolean
  onClose: () => void
  sources?: { id: string; nom: string }[]
  sites?: { id: string; nom: string; ville: string }[]
}

export default function LeadFormModal({ isOpen, onClose, sources = [], sites = [] }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    ville: '',
    source_id: '',
    site_prefere_id: sites[0]?.id || '',
    interet_produit: '',
    budget: '',
    delai_achat: '1 à 3 mois',
    financement: false,
    reprise_vehicule: false,
    notes: '',
  })

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await createLead({
      nom: formData.nom,
      prenom: formData.prenom || undefined,
      telephone: formData.telephone,
      email: formData.email || undefined,
      ville: formData.ville || undefined,
      source_id: formData.source_id || undefined,
      site_prefere_id: formData.site_prefere_id || undefined,
      interet_produit: formData.interet_produit || undefined,
      budget: formData.budget ? Number(formData.budget) : undefined,
      delai_achat: formData.delai_achat || undefined,
      financement: formData.financement,
      reprise_vehicule: formData.reprise_vehicule,
      notes: formData.notes || undefined,
      consentement_contact: true,
    })

    setLoading(false)

    if (!res.success) {
      setError(res.error ?? 'Une erreur est survenue')
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
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Nouveau prospect rapide</h3>
              <p className="text-xs text-gray-400">Insertion immédiate dans la file CRC</p>
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
                value={formData.nom}
                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Bennani"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Prénom</label>
              <input
                type="text"
                value={formData.prenom}
                onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Youssef"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone * (+212)</label>
              <input
                type="tel"
                required
                value={formData.telephone}
                onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                placeholder="0661234567"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="youssef@example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ville</label>
              <input
                type="text"
                value={formData.ville}
                onChange={e => setFormData({ ...formData, ville: e.target.value })}
                placeholder="Casablanca"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                <Megaphone className="w-3.5 h-3.5 text-brand-600" />
                Source du lead
              </label>
              <select
                value={formData.source_id}
                onChange={e => setFormData({ ...formData, source_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
              >
                <option value="">Non renseignée</option>
                {sources.map(s => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Showroom souhaité</label>
            <select
              value={formData.site_prefere_id}
              onChange={e => setFormData({ ...formData, site_prefere_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
            >
              <option value="">Sélectionner un site...</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.nom} ({s.ville})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Modèle / Produit d'intérêt</label>
              <input
                type="text"
                value={formData.interet_produit}
                onChange={e => setFormData({ ...formData, interet_produit: e.target.value })}
                placeholder="SUV Hybride 2025"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Budget envisagé (MAD)</label>
              <input
                type="number"
                value={formData.budget}
                onChange={e => setFormData({ ...formData, budget: e.target.value })}
                placeholder="280000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-6 pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.financement}
                onChange={e => setFormData({ ...formData, financement: e.target.checked })}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-gray-700">Demande de financement</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.reprise_vehicule}
                onChange={e => setFormData({ ...formData, reprise_vehicule: e.target.checked })}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-gray-700">Reprise véhicule</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes initiales</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Préciser la demande ou questions particulières du prospect..."
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
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-lg text-xs font-medium shadow-sm"
            >
              {loading ? 'Enregistrement…' : 'Créer et envoyer au CRC'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

