'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import LeadEditModal from './LeadEditModal'

interface Props {
  lead: {
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
  sources?: { id: string; nom: string }[]
  sites?: { id: string; nom: string; ville: string }[]
}

export default function LeadEditButton({ lead, sources = [], sites = [] }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        Modifier
      </button>
      <LeadEditModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        lead={lead}
        sources={sources}
        sites={sites}
      />
    </>
  )
}
