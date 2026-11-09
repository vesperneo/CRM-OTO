import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import { LEAD_SOURCES } from '@/lib/constants'
import LeadsView from '@/components/leads/LeadsView'

export default async function LeadsPage() {
  let leads: any[] | null = null
  let sources: any[] | null = null
  let sites: any[] | null = null
  const configured = isSupabaseConfigured()

  if (configured) {
    const supabase = await createClient()

    const [leadsResult, sourcesResult, sitesResult] = await Promise.all([
      supabase
        .from('leads')
        .select('*, source:sources(nom), site_prefere:sites(nom)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('sources').select('id, nom').eq('actif', true),
      supabase.from('sites').select('id, nom, ville').eq('actif', true),
    ])

    leads = leadsResult.data
    sources = sourcesResult.data
    sites = sitesResult.data
  }


  const items = leads ?? []

  return (
    <LeadsView
      initialLeads={items}
      sources={configured ? (sources ?? []) : LEAD_SOURCES}
      sites={sites ?? []}
    />
  )
}
