import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import LeadKanban from '@/components/leads/LeadKanban'

export default async function KanbanPage() {
  let leads: any[] | null = null

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    const { data } = await supabase
      .from('leads')
      .select('*, source:sources(nom), site_prefere:sites(nom)')
      .order('created_at', { ascending: false })
    leads = data
  }


  const items = leads ?? []

  return <LeadKanban initialLeads={items} />
}

