import { Users, PhoneCall, AlertCircle, Clock, CheckCircle } from 'lucide-react'

export default function SupervisionPage() {
  const agents = [
    { id: '1', nom: 'Karim Alami', statut: 'en_appel', duree: '04:12', appelsJour: 28, rdvPris: 6, scoreQualite: '92%' },
    { id: '2', nom: 'Sara Mansouri', statut: 'disponible', duree: '01:45', appelsJour: 34, rdvPris: 8, scoreQualite: '95%' },
    { id: '3', nom: 'Yassine Berrada', statut: 'pause', duree: '08:30', appelsJour: 19, rdvPris: 3, scoreQualite: '86%' },
    { id: '4', nom: 'Hind El Fassi', statut: 'hors_ligne', duree: '—', appelsJour: 0, rdvPris: 0, scoreQualite: '—' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Supervision CRC en temps réel</h2>
          <p className="text-sm text-gray-500">Suivi des agents, charge des files d'attente et respect des SLAs</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-50">
            Réassignation en masse
          </button>
        </div>
      </div>

      {/* Cartes métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase">Agents connectés</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">3 / 4</p>
          <span className="text-xs text-emerald-600 font-medium">2 en ligne, 1 en pause</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase">Leads en attente CRC</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">14</p>
          <span className="text-xs text-amber-600 font-medium">2 dépassent SLA 15 min</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase">Appels passés aujourd'hui</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">81</p>
          <span className="text-xs text-blue-600 font-medium">Moy. 27 appels / agent</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium uppercase">Taux de conversion RDV</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">21.0%</p>
          <span className="text-xs text-emerald-600 font-medium">17 RDV confirmés</span>
        </div>
      </div>

      {/* Tableau des agents */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-semibold text-gray-900 text-sm">
          Statut des agents CRC
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Agent</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Temps d'état</th>
                <th className="py-3 px-4">Appels du jour</th>
                <th className="py-3 px-4">RDV pris</th>
                <th className="py-3 px-4">Score Qualité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {agents.map(a => (
                <tr key={a.id} className="hover:bg-gray-50/70">
                  <td className="py-3 px-4 font-medium text-gray-900">{a.nom}</td>
                  <td className="py-3 px-4">
                    {a.statut === 'en_appel' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">● En appel</span>}
                    {a.statut === 'disponible' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">● Disponible</span>}
                    {a.statut === 'pause' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">● En pause</span>}
                    {a.statut === 'hors_ligne' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">● Hors ligne</span>}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-gray-600">{a.duree}</td>
                  <td className="py-3 px-4 text-gray-800 font-medium">{a.appelsJour}</td>
                  <td className="py-3 px-4 text-emerald-700 font-medium">{a.rdvPris}</td>
                  <td className="py-3 px-4 text-xs font-semibold text-gray-700">{a.scoreQualite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
