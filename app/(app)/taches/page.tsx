import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import TasksBoard, { type TaskItem } from '@/components/tasks/TasksBoard'

function atToday(hours: number, minutes = 0, offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

const DEMO_TASKS: TaskItem[] = [
  {
    id: 'demo-task-1',
    type: 'rappel_appel',
    statut: 'en_attente',
    echeance: atToday(15, 0),
    notes: 'A demandé un rappel pour le calcul de mensualité LOA',
    lead: { prenom: 'Youssef', nom: 'Bennani', telephone: '+212661234567' },
    __demo: true,
  },
  {
    id: 'demo-task-2',
    type: 'confirmation_rdv',
    statut: 'en_attente',
    echeance: atToday(17, 0),
    notes: 'RDV prévu demain 10h30 à Casablanca Centre',
    lead: { prenom: 'Mehdi', nom: 'Tazi', telephone: '+212663112233' },
    __demo: true,
  },
  {
    id: 'demo-task-3',
    type: 'whatsapp',
    statut: 'en_attente',
    echeance: atToday(11, 0, -1),
    notes: 'Envoyer brochure PDF et grille tarifaire',
    lead: { prenom: 'Hicham', nom: 'Kabbaj', telephone: '+212665889911' },
    __demo: true,
  },
  {
    id: 'demo-task-4',
    type: 'reactivation',
    statut: 'en_attente',
    echeance: atToday(10, 30, 1),
    notes: 'Relance après 5 tentatives sans réponse',
    lead: { prenom: 'Salma', nom: 'Chraibi', telephone: '+212664445566' },
    __demo: true,
  },
]

export default async function TasksPage() {
  let tasks: TaskItem[] = DEMO_TASKS

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    try {
      const { data, error } = await supabase
        .from('tasks_relances')
        .select(
          '*, lead:leads(nom, prenom, telephone), assigne:profiles!tasks_relances_assigne_a_fkey(nom, prenom)'
        )
        .order('echeance', { ascending: true })
        .limit(100)

      if (!error && data) {
        tasks = data as unknown as TaskItem[]
      }
    } catch {
      tasks = DEMO_TASKS
    }
  }

  return <TasksBoard initialTasks={tasks} />
}
