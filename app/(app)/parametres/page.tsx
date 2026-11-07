import Link from 'next/link'
import {
  Settings,
  Users,
  Building,
  PhoneCall,
  Sliders,
  Bell,
  Shield,
  BarChart3,
  CheckCircle2,
  XCircle,
  Mail,
  MessageCircle,
  CalendarDays,
  ArrowRight,
} from 'lucide-react'
import { isSupabaseConfigured } from '@/lib/utils'

export default function SettingsPage() {
  const sections = [
    {
      title: 'Utilisateurs & équipes',
      desc: 'Rôles (Admin, Superviseur, Agent CRC, Commercial), équipes et affectations.',
      icon: Users,
      href: null,
    },
    {
      title: 'Sites & showrooms',
      desc: 'Lieux de rendez-vous (Casablanca, Rabat, Marrakech), horaires et commerciaux.',
      icon: Building,
      href: '/rendez-vous',
    },
    {
      title: 'Dispositions & scripts CRC',
      desc: 'Motifs de fin d’appel et scripts dynamiques par campagne.',
      icon: PhoneCall,
      href: '/crc/file',
    },
    {
      title: 'Cadences d’appel & SLAs',
      desc: 'Délais automatiques entre tentatives (J0+3h, J+1, J+2, J+4), seuils et escalades.',
      icon: Sliders,
      href: '/crc/supervision',
    },
    {
      title: 'Modèles de messages',
      desc: 'Templates WhatsApp et emails de confirmation avec variables dynamiques.',
      icon: Bell,
      href: '/rendez-vous',
    },
    {
      title: 'Conformité & DNC',
      desc: 'Liste « Ne pas appeler », consentements, droits CNDP / loi 09-08.',
      icon: Shield,
      href: '/conformite',
    },
    {
      title: 'Analytique & exports',
      desc: 'Funnel, tendances, performance des sources et des agents, exports.',
      icon: BarChart3,
      href: '/analytics',
    },
  ]

  const integrations = [
    {
      label: 'Supabase (base & auth)',
      env: 'NEXT_PUBLIC_SUPABASE_URL',
      active: isSupabaseConfigured(),
      icon: Shield,
    },
    {
      label: 'Resend (emails RDV)',
      env: 'RESEND_API_KEY',
      active: Boolean(process.env.RESEND_API_KEY),
      icon: Mail,
    },
    {
      label: 'WhatsApp Cloud API',
      env: 'WHATSAPP_API_TOKEN',
      active: Boolean(
        process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
      ),
      icon: MessageCircle,
    },
    {
      label: 'Twilio (VoIP click-to-call)',
      env: 'TWILIO_ACCOUNT_SID',
      active: Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_AUTH_TOKEN &&
          process.env.TWILIO_FROM_NUMBER
      ),
      icon: PhoneCall,
    },
    {
      label: 'Google Calendar',
      env: 'GOOGLE_CALENDAR_ACCESS_TOKEN',
      active: Boolean(process.env.GOOGLE_CALENDAR_ACCESS_TOKEN),
      icon: CalendarDays,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Paramètres de la plateforme</h2>
          <p className="text-sm text-gray-500">
            Configuration générale du CRM Otoclic
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          const content = (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-brand-300 transition-colors h-full">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                {section.href && (
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{section.title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{section.desc}</p>
            </div>
          )
          return section.href ? (
            <Link key={section.title} href={section.href}>
              {content}
            </Link>
          ) : (
            <div key={section.title}>{content}</div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Intégrations externes</h3>
          <p className="text-[11px] text-gray-400">
            Statut des connecteurs configurés dans les variables d’environnement.
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {integrations.map((integration) => {
            const Icon = integration.icon
            return (
              <div
                key={integration.label}
                className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900">
                      {integration.label}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {integration.env}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                    integration.active
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {integration.active ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {integration.active ? 'Configuré' : 'Non configuré'}
                </span>
              </div>
            )
          })}
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">
            Sans clés configurées, les envois sont simulés et journalisés en statut
            <span className="font-mono"> queued</span>. Voir <span className="font-mono">.env.example</span> et le README.
          </p>
        </div>
      </div>
    </div>
  )
}