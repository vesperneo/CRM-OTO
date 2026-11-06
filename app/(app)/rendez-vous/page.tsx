import { Calendar, Plus, Clock, MapPin, User, Check, X } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function AppointmentsPage() {
  const appointments = [
    {
      id: 'rdv-1',
      prospect: 'Mehdi Tazi',
      telephone: '+212663112233',
      date: 'Demain à 10:30',
      site: 'Showroom Casa Centre',
      commercial: 'Hassan Alami',
      statut: 'confirme',
      type: 'showroom',
    },
    {
      id: 'rdv-2',
      prospect: 'Nadia Bennis',
      telephone: '+212661556677',
      date: 'Demain à 14:00',
      site: 'Showroom Rabat Agdal',
      commercial: 'Reda Tazi',
      statut: 'planifie',
      type: 'showroom',
    },
    {
      id: 'rdv-3',
      prospect: 'Kamal Idrissi',
      telephone: '+212662110022',
      date: 'Vendredi à 16:30',
      site: 'Showroom Marrakech',
      commercial: 'Anas Ben',
      statut: 'confirme',
      type: 'showroom',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rendez-vous Showroom</h2>
          <p className="text-sm text-gray-500">Planification des créneaux, confirmation CRC J-1 et suivi commercial</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm">
          <Plus className="w-4 h-4" />
          Planifier un RDV
        </button>
      </div>

      {/* Liste des rendez-vous */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-900 text-sm">Rendez-vous à venir</span>
          <span className="text-xs text-gray-500">Africa/Casablanca (GMT+1)</span>
        </div>
        <div className="divide-y divide-gray-100">
          {appointments.map(rdv => (
            <div key={rdv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{rdv.prospect}</span>
                  <span className="text-xs font-mono text-gray-500">{rdv.telephone}</span>
                  {rdv.statut === 'confirme' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Confirmé CRC J-1
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Planifié
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {rdv.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {rdv.site}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    Commercial: {rdv.commercial}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200">
                  Effectué
                </button>
                <button className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200">
                  Absent
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
