import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import TasksBoard, { type TaskItem } from '@/components/tasks/TasksBoard'

export default async function TasksPage() {
  let tasks: TaskItem[] = []

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
      tasks = []
    }
  }

  return <TasksBoard initialTasks={tasks} />
}
