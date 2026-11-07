'use client'

import { useState } from 'react'
import { Phone, Calendar, MessageSquare, RefreshCw, FileText, CheckCircle2, User, Send } from 'lucide-react'
import { formatDateTime, formatTimeAgo, formatDureeAppel } from '@/lib/utils'
import { addLeadNote } from '@/features/leads/actions'

interface Activity {
  id: string
  type: string
  created_at: string
  contenu: any
  auteur?: { nom: string; prenom?: string | null } | null
}

interface Props {
  leadId: string
  activities: Activity[]
}

export default function LeadTimeline({ leadId, activities = [] }: Props) {
  const [noteText, setNoteText] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return

    setLoading(true)
    await addLeadNote(leadId, noteText)
    setNoteText('')
    setLoading(false)
  }

  function renderIcon(type: string) {
    switch (type) {
      case 'appel':
        return <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center shrink-0"><Phone className="w-4 h-4" /></div>
      case 'rdv':
        return <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Calendar className="w-4 h-4" /></div>
      case 'changement_statut':
        return <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0"><RefreshCw className="w-4 h-4" /></div>
      case 'tache':
        return <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4" /></div>
      case 'note':
      default:
        return <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulaire ajout de note */}
      <form onSubmit={handleAddNote} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <label className="block text-xs font-semibold text-gray-700">Ajouter une note ou compte-rendu interne</label>
        <div className="relative">
          <textarea
            rows={2}
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Ex: Le prospect est très intéressé par la finition GT, à recontacter après son retour de voyage..."
            className="w-full p-3 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !noteText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Ajout…' : 'Enregistrer la note'}
          </button>
        </div>
      </form>

      {/* Timeline des événements */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h4 className="font-semibold text-gray-900 text-sm mb-4">Historique complet des interactions</h4>

        {activities.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-4 text-center">Aucune activité enregistrée pour le moment.</p>
        ) : (
          <div className="relative border-l border-gray-200 ml-4 space-y-6">
            {activities.map((act) => (
              <div key={act.id} className="relative pl-6">
                {/* Icône sur l'axe */}
                <div className="absolute -left-4 top-0">
                  {renderIcon(act.type)}
                </div>

                <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-900 capitalize">
                      {act.type === 'appel' && 'Appel téléphonique CRC'}
                      {act.type === 'changement_statut' && 'Changement de statut'}
                      {act.type === 'note' && 'Note interne'}
                      {act.type === 'rdv' && 'Rendez-vous Showroom'}
                      {act.type === 'systeme' && 'Événement système'}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {formatTimeAgo(act.created_at)} ({formatDateTime(act.created_at)})
                    </span>
                  </div>

                  {/* Détails du contenu selon le type */}
                  {act.type === 'appel' && (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded text-[11px]">
                          Disposition : {act.contenu?.disposition ?? 'Sans disposition'}
                        </span>
                        {act.contenu?.duree && (
                          <span className="text-gray-500 font-mono text-[11px]">
                            Durée : {formatDureeAppel(act.contenu.duree)}
                          </span>
                        )}
                      </div>
                      {act.contenu?.notes && (
                        <p className="text-gray-600 mt-1 italic">"{act.contenu.notes}"</p>
                      )}
                    </div>
                  )}

                  {act.type === 'changement_statut' && (
                    <p className="text-xs text-gray-700">
                      Statut passé de <span className="font-semibold">{act.contenu?.ancien_statut}</span> à{' '}
                      <span className="font-semibold text-brand-700">{act.contenu?.nouveau_statut}</span>
                      {act.contenu?.raison && ` (Motif : ${act.contenu.raison})`}
                    </p>
                  )}

                  {act.type === 'note' && (
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{act.contenu?.texte}</p>
                  )}

                  {act.auteur && (
                    <div className="text-[10px] text-gray-400 pt-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Par {act.auteur.prenom} {act.auteur.nom}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

