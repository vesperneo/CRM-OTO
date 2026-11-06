import { CheckCircle2, Clock, Phone, MessageSquare, AlertCircle } from 'lucide-react'

export default function TasksPage() {
  const tasks = [
    {
      id: 'task-1',
      titre: 'Rappeler Youssef Bennani',
      type: 'rappel_appel',
      prospect: 'Youssef Bennani',
      telephone: '+212661234567',
      echeance: 'Aujourd\'hui 15:00',
      retard: false,
      note: 'A demandé un rappel pour le calcul de mensualité LOA',
    },
    {
      id: 'task-2',
      titre: 'Confirmation RDV Showroom J-1',
      type: 'confirmation_rdv',
      prospect: 'Mehdi Tazi',
      telephone: '+212663112233',
      echeance: 'Aujourd\'hui 17:00',
      retard: false,
      note: 'RDV prévu demain 10h30 à Casablanca Centre',
    },
    {
      id: 'task-3',
      titre: 'Relance prospect silencieux',
      type: 'whatsapp',
      prospect: 'Hicham Kabbaj',
      telephone: '+212665889911',
      echeance: 'Hier 11:00',
      retard: true,
      note: 'Envoyer brochure PDF et grille tarifaire',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mes tâches de relance</h2>
          <p className="text-sm text-gray-500">Rappels téléphoniques, confirmations de RDV et messages programmés</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-sm">Tâches prioritaires du jour</span>
          <span className="text-xs text-amber-600 font-medium">1 tâche en retard</span>
        </div>
        <div className="divide-y divide-gray-100">
          {tasks.map(t => (
            <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{t.titre}</span>
                  {t.retard && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">
                      En retard
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600">{t.note}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>Prospect: {t.prospect} ({t.telephone})</span>
                  <span>•</span>
                  <span>Échéance: {t.echeance}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${t.telephone}`}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Appeler
                </a>
                <button className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Terminer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
