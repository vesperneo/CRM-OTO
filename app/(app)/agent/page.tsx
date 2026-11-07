import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Headphones,
  MessageCircle,
  Phone,
  PhoneCall,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/profile'
import { getRoleHome } from '@/lib/demo-profile'
import { formatDate, makeTelLink } from '@/lib/utils'

interface AgentTask {
  id: string
  type: string
  echeance: string
  notes?: string | null
  lead?: { nom: string; prenom?: string | null; telephone: string } | null
}

interface AgentAppointment {
  id: string
  debut: string
  type: string
  statut: string
  lead?: { nom: string; prenom?: string | null; telephone: string } | null
}

interface AgentLead {
  id: string
  nom: string
  prenom?: string | null
  telephone: string
  statut: string
  priorite?: number | null
}

const TASK_LABELS: Record<string, { label: string; icon: typeof Phone }> = {
  rappel_appel: { label: 'Rappel téléphonique', icon: Phone },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  email: { label: 'Email', icon: MessageCircle },
  confirmation_rdv: { label: 'Confirmation RDV', icon: CalendarDays },
  reactivation: { label: 'Réactivation', icon: Sparkles },
  suivi_commercial: { label: 'Suivi commercial', icon: Target },
}

function at(offsetDays: number, hours: number, minutes = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

const DEMO_TASKS: AgentTask[] = [
  {
    id: 'demo-task-1',
    type: 'rappel_appel',
    echeance: at(0, 9, 30),
    notes: 'Rappeler suite à la demande de devis SUV',
    lead: { nom: 'Bennani', prenom: 'Youssef', telephone: '+212661234567' },
  },
  {
    id: 'demo-task-2',
    type: 'whatsapp',
    echeance: at(0, 11, 0),
    notes: 'Envoyer la fiche technique du modèle hybride',
    lead: { nom: 'El Amrani', prenom: 'Fatima', telephone: '+212662987654' },
  },
  {
    id: 'demo-task-3',
    type: 'confirmation_rdv',
    echeance: at(0, 14, 0),
    notes: 'Confirmer le RDV showroom Casa Centre',
    lead: { nom: 'Tazi', prenom: 'Mehdi', telephone: '+212663112233' },
  },
  {
    id: 'demo-task-4',
    type: 'reactivation',
    echeance: at(0, 16, 30),
    notes: 'Relancer un lead froid — campagne LOA',
    lead: { nom: 'Chraibi', prenom: 'Salma', telephone: '+212664445566' },
  },
]

const DEMO_APPOINTMENTS: AgentAppointment[] = [
  {
    id: 'demo-appt-1',
    debut: at(1, 10, 30),
    type: 'showroom',
    statut: 'planifie',
    lead: { nom: 'Bennani', prenom: 'Youssef', telephone: '+212661234567' },
  },
  {
    id: 'demo-appt-2',
    debut: at(2, 15, 0),
    type: 'showroom',
    statut: 'confirme',
    lead: { nom: 'El Amrani', prenom: 'Fatima', telephone: '+212662987654' },
  },
  {
    id: 'demo-appt-3',
    debut: at(3, 11, 0),
    type: 'appel',
    statut: 'planifie',
    lead: { nom: 'Tazi', prenom: 'Mehdi', telephone: '+212663112233' },
  },
]

const DEMO_LEADS: AgentLead[] = [
  { id: 'demo-lead-1', nom: 'Bennani', prenom: 'Youssef', telephone: '+212661234567', statut: 'nouveau', priorite: 2 },
  { id: 'demo-lead-2', nom: 'El Amrani', prenom: 'Fatima', telephone: '+212662987654', statut: 'a_rappeler', priorite: 1 },
  { id: 'demo-lead-3', nom: 'Chraibi', prenom: 'Salma', telephone: '+212664445566', statut: 'en_qualification_crc', priorite: 1 },
  { id: 'demo-lead-4', nom: 'Tazi', prenom: 'Mehdi', telephone: '+212663112233', statut: 'qualifie', priorite: 0 },
  { id: 'demo-lead-5', nom: 'Idrissi', prenom: 'Nadia', telephone: '+212665778899', statut: 'nouveau', priorite: 2 },
]

const DEMO_METRICS = {
  leadsAssignes: 24,
  appelsJour: 31,
  tachesJour: 7,
  rdvAVenir: 3,
}

const STATUT_LABELS: Record<string, string> = {
  nouveau: 'Nouveau',
  en_qualification_crc: 'En qualification',
  qualifie: 'Qualifié',
  a_rappeler: 'À rappeler',
  rdv_planifie: 'RDV planifié',
  rdv_confirme: 'RDV confirmé',
}

export default async function AgentPage() {
  const { profile, isDemo } = await getCurrentProfile()

  if (!profile) redirect('/login')
  if (profile.role !== 'agent_crc' && profile.role !== 'admin') {
    redirect(getRoleHome(profile.role))
  }

  let tasks = DEMO_TASKS
  let appointments = DEMO_APPOINTMENTS
  let leads = DEMO_LEADS
  let metrics = DEMO_METRICS

  if (!isDemo) {
    const supabase = await createClient()
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(startOfToday)
    endOfToday.setDate(endOfToday.getDate() + 1)

    try {
      const [leadsCount, callsCount, tasksCount, tasksResult, apptsResult, leadsResult] =
        await Promise.all([
          (supabase.from('leads') as any)
            .select('id', { count: 'exact', head: true })
            .eq('assigne_crc_a', profile.id)
            .not('statut', 'in', '("gagne","perdu","ne_pas_rappeler","doublon")'),
          (supabase.from('calls') as any)
            .select('id', { count: 'exact', head: true })
            .eq('agent_id', profile.id)
            .gte('debut', startOfToday.toISOString()),
          (supabase.from('tasks_relances') as any)
            .select('id', { count: 'exact', head: true })
            .eq('assigne_a', profile.id)
            .eq('statut', 'en_attente')
            .lt('echeance', endOfToday.toISOString()),
          (supabase.from('tasks_relances') as any)
            .select('id, type, echeance, notes, lead:leads(nom, prenom, telephone)')
            .eq('assigne_a', profile.id)
            .eq('statut', 'en_attente')
            .lt('echeance', endOfToday.toISOString())
            .order('echeance', { ascending: true })
            .limit(6),
          (supabase.from('appointments') as any)
            .select('id, debut, type, statut, lead:leads(nom, prenom, telephone)')
            .eq('assigne_a_id', profile.id)
            .gte('debut', new Date().toISOString())
            .in('statut', ['planifie', 'confirme'])
            .order('debut', { ascending: true })
            .limit(5),
          (supabase.from('leads') as any)
            .select('id, nom, prenom, telephone, statut, priorite')
            .eq('assigne_crc_a', profile.id)
            .not('statut', 'in', '("gagne","perdu","ne_pas_rappeler","doublon")')
            .order('priorite', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(5),
        ])

      tasks = (tasksResult.data ?? []) as unknown as AgentTask[]
      appointments = (apptsResult.data ?? []) as unknown as AgentAppointment[]
      leads = (leadsResult.data ?? []) as AgentLead[]
      metrics = {
        leadsAssignes: leadsCount.count ?? 0,
        appelsJour: callsCount.count ?? 0,
        tachesJour: tasksCount.count ?? 0,
        rdvAVenir: appointments.length,
      }
    } catch {
      tasks = []
      appointments = []
      leads = []
    }
  }

  const heure = new Date().getHours()
  const salutation = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'
  const totalActions = metrics.tachesJour + metrics.appelsJour

  const kpis = [
    {
      label: 'Leads assignés',
      value: String(metrics.leadsAssignes),
      hint: 'À traiter dans ma file',
      icon: Users,
      tone: 'bg-brand-50 text-brand-600',
    },
    {
      label: 'Appels aujourd’hui',
      value: String(metrics.appelsJour),
      hint: `${totalActions} actions au total`,
      icon: PhoneCall,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Tâches du jour',
      value: String(metrics.tachesJour),
      hint: 'Relances et confirmations',
      icon: ClipboardList,
      tone: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'RDV à venir',
      value: String(metrics.rdvAVenir),
      hint: 'Prochains rendez-vous',
      icon: CalendarDays,
      tone: 'bg-violet-50 text-violet-600',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {salutation} {profile.prenom ?? profile.nom}
            </h2>
            <p className="text-sm text-gray-500">
              Votre espace agent CRC — file d’appels, tâches et rendez-vous
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Disponible
        </span>
      </div>

      {isDemo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2">
          <Headphones className="w-4 h-4 shrink-0" />
          Mode démonstration — utilisez le sélecteur de rôle pour tester superviseur ou admin.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{kpi.hint}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-2 top-14 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">
              Ma file d’appels
            </p>
            <p className="text-2xl font-bold mt-1">
              {metrics.leadsAssignes} prospects à traiter
            </p>
            <p className="text-xs text-emerald-50 mt-1">
              Priorité aux nouveaux leads et aux rappels programmés
            </p>
          </div>
          <Link
            href="/crc/file"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-emerald-700 text-sm font-bold rounded-xl shadow-md hover:bg-emerald-50 transition-colors shrink-0"
          >
            <Phone className="w-4 h-4" />
            Démarrer
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Ma journée</h3>
            <Link href="/taches" className="text-[11px] font-semibold text-brand-600">
              Toutes les tâches
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {tasks.map((task) => {
              const config = TASK_LABELS[task.type] ?? {
                label: task.type,
                icon: ClipboardList,
              }
              const Icon = config.icon
              return (
                <div key={task.id} className="flex items-start gap-3 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900">{config.label}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {task.lead
                        ? `${[task.lead.prenom, task.lead.nom].filter(Boolean).join(' ')} · ${task.lead.telephone}`
                        : task.notes ?? 'Sans prospect lié'}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(task.echeance, 'HH:mm')}
                  </span>
                </div>
              )
            })}
            {tasks.length === 0 && (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Aucune tâche en attente.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Prochains rendez-vous</h3>
            <Link href="/rendez-vous" className="text-[11px] font-semibold text-brand-600">
              Calendrier
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {appointments.map((appt) => (
              <div key={appt.id} className="flex items-center gap-3 py-2.5">
                <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-semibold uppercase">
                    {formatDate(appt.debut, 'MMM')}
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {formatDate(appt.debut, 'dd')}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {appt.lead
                      ? [appt.lead.prenom, appt.lead.nom].filter(Boolean).join(' ')
                      : 'Prospect'}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {appt.type === 'visio' ? 'Visio' : appt.type === 'appel' ? 'Appel' : 'Showroom'} ·{' '}
                    {formatDate(appt.debut, 'HH:mm')}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    appt.statut === 'confirme'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {appt.statut === 'confirme' ? 'Confirmé' : 'Planifié'}
                </span>
              </div>
            ))}
            {appointments.length === 0 && (
              <div className="py-8 text-center">
                <CalendarDays className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Aucun rendez-vous à venir.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">Leads prioritaires</h3>
          <Link href="/leads" className="text-[11px] font-semibold text-brand-600">
            Tous les leads
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-200 transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                {(lead.prenom?.[0] ?? '') + lead.nom[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {[lead.prenom, lead.nom].filter(Boolean).join(' ')}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {STATUT_LABELS[lead.statut] ?? lead.statut} · {lead.telephone}
                </p>
              </div>
              <a
                href={makeTelLink(lead.telephone)}
                className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shrink-0"
                title="Appeler"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
          {leads.length === 0 && (
            <p className="text-xs text-gray-400 py-6 text-center md:col-span-2 xl:col-span-3">
              Aucun lead prioritaire assigné.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "File d’appels", href: '/crc/file', icon: PhoneCall },
          { label: 'Mes tâches', href: '/taches', icon: ClipboardList },
          { label: 'Rendez-vous', href: '/rendez-vous', icon: CalendarDays },
          { label: 'Leads', href: '/leads', icon: Users },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex items-center gap-2 hover:border-brand-300 transition-colors"
            >
              <Icon className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-semibold text-gray-700">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
