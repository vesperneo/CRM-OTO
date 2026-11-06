import { Settings, Users, Building, PhoneCall, Sliders, Bell, Shield } from 'lucide-react'

export default function SettingsPage() {
  const sections = [
    { title: 'Utilisateurs & Équipes', desc: 'Gestion des rôles (Admin, Superviseur, Agent CRC, Commercial) et affectations', icon: Users },
    { title: 'Sites & Showrooms', desc: 'Lieux de rendez-vous (Casablanca, Rabat, Marrakech), horaires et commericaux', icon: Building },
    { title: 'Dispositions & Scripts CRC', desc: 'Motifs de fin d\'appel et scripts dynamiques par campagne', icon: PhoneCall },
    { title: 'Cadences d\'appel & SLAs', desc: 'Délais automatiques entre tentatives (J0, J0+3h, J+1...) et alertes', icon: Sliders },
    { title: 'Modèles de messages', desc: 'Templates WhatsApp et emails de confirmation avec tags dynamiques', icon: Bell },
    { title: 'Conformité & DNC', desc: 'Liste "Ne pas appeler", traçabilité des consentements CNDP / RGPD', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Paramètres de la plateforme</h2>
        <p className="text-sm text-gray-500">Configuration générale du CRM Otoclic</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{s.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
