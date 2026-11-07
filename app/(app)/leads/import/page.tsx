import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import { LEAD_SOURCES } from '@/lib/constants'
import ImportCSVView from '@/components/leads/ImportCSVView'

export default async function ImportPage() {
  let sources: { id: string; nom: string }[] = []

  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    const { data } = await supabase.from('sources').select('id, nom').eq('actif', true)
    sources = (data as { id: string; nom: string }[]) ?? []
  } else {
    sources = LEAD_SOURCES.map(({ id, nom }) => ({ id, nom }))
  }

  return <ImportCSVView sources={sources} />
}
