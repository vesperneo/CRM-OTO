import { Phone, CheckCircle, Clock, Calendar, MessageSquare, Play, ShieldAlert } from 'lucide-react'
import { formatTelephone, formatMontant } from '@/lib/utils'

export default function CallQueuePage() {
  const currentLead = {
    id: 'lead-queue-1',
    nom: 'Benjelloun',
    prenom: 'Omar',
    telephone: '+212661889900',
    statut: 'nouveau',
    source: 'Meta Lead Ads (Campagne Salon Auto)',
    interet_produit: 'SUV Hybride 2025',
    budget: 320000,
    ville: 'Casablanca',
    site_prefere: 'Showroom Casa Centre',
    nb_tentatives: 0,
    delai_ecoule: '8 minutes',
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ma file d'appels CRC</h2>
          <p className="text-sm text-gray-500">Mode automatique : priorité Nouveaux leads &gt; Rappels programmés &gt; Relances</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            ● Agent en ligne (Prêt pour appel)
          </span>
        </div>
      </div>

      {/* Écran d'appel en cours (1 seul écran optimisé CRC) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : Infos prospect + Téléphonie */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 uppercase tracking-wider mb-2">
              Lead verrouillé pour vous (30 min)
            </span>
            <h3 className="text-xl font-bold text-gray-900">
              {currentLead.prenom} {currentLead.nom}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">En attente depuis {currentLead.delai_ecoule} • {currentLead.source}</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">Téléphone</span>
              <span className="font-mono font-medium text-gray-900">{formatTelephone(currentLead.telephone)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">Intérêt produit</span>
              <span className="font-medium text-gray-900">{currentLead.interet_produit}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">Budget envisagé</span>
              <span className="font-medium text-gray-900">{formatMontant(currentLead.budget)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">Ville / Site</span>
              <span className="font-medium text-gray-900">{currentLead.ville} ({currentLead.site_prefere})</span>
            </div>
          </div>

          {/* Action principale : Click-to-call */}
          <div className="pt-2">
            <a
              href={`tel:${currentLead.telephone}`}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-colors text-base"
            >
              <Phone className="w-5 h-5 animate-pulse" />
              Appeler ({formatTelephone(currentLead.telephone)})
            </a>
            <p className="text-center text-xs text-gray-400 mt-2">
              Chronomètre d'appel démarré automatiquement au clic
            </p>
          </div>
        </div>

        {/* Colonne centrale : Script d'appel dynamique + Qualification */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Script de qualification dynamique</h3>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Campagne 2025</span>
          </div>

          {/* Script questions */}
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100">
              <p className="font-semibold text-blue-950">Accroche conseillée :</p>
              <p className="text-blue-900 mt-1 italic">
                "Bonjour M. Benjelloun, je suis de l'équipe Otoclic. Vous avez fait une demande concernant le SUV Hybride. Avez-vous 2 minutes pour faire le point sur vos critères ?"
              </p>
            </div>

            <div className="space-y-3">
              <label className="block font-medium text-gray-700">Délai d'achat prévu :</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="p-2 border border-gray-200 rounded text-left hover:bg-gray-50 focus:border-blue-500 focus:bg-blue-50">Immédiat (&lt; 1 mois)</button>
                <button type="button" className="p-2 border border-gray-200 rounded text-left hover:bg-gray-50 focus:border-blue-500 focus:bg-blue-50">1 à 3 mois</button>
              </div>

              <label className="block font-medium text-gray-700 pt-2">Projet de reprise véhicule actuel ?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5"><input type="radio" name="reprise" /> Oui</label>
                <label className="flex items-center gap-1.5"><input type="radio" name="reprise" /> Non</label>
              </div>

              <label className="block font-medium text-gray-700 pt-2">Option de financement souhaitée ?</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5"><input type="radio" name="financement" /> Crédit / LOA</label>
                <label className="flex items-center gap-1.5"><input type="radio" name="financement" /> Comptant</label>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite : Fin d'appel obligatoire (Disposition) + Prise de RDV */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-semibold text-gray-900">Issue de l'appel (Obligatoire)</h3>
            <p className="text-xs text-gray-400 mt-0.5">Choisir une disposition pour déverrouiller le lead suivant</p>
          </div>

          <div className="space-y-2">
            <button className="w-full text-left p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium text-xs flex items-center justify-between">
              <span>📅 Rendez-vous pris en showroom</span>
              <CheckCircle className="w-4 h-4 text-blue-600" />
            </button>
            <button className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs">
              📞 Répondu — À rappeler plus tard
            </button>
            <button className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs">
              📵 Pas de réponse (Enclencher cadence J0+3h)
            </button>
            <button className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs">
              💬 Messagerie / Occupé
            </button>
            <button className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs text-red-700">
              ❌ Pas intéressé / Ne pas rappeler
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes d'appel :</label>
            <textarea
              rows={3}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Préciser les attentes du client, modèle spécifique, contraintes d'horaires..."
            />
          </div>

          <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors">
            Enregistrer & Passer au lead suivant →
          </button>
        </div>
      </div>
    </div>
  )
}
