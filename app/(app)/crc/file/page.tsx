import { createClient } from '@/lib/supabase/server'
import { fetchNextLeadForAgent } from '@/features/calls/actions'
import { isSupabaseConfigured } from '@/lib/utils'
import CallQueueView, {
  type Disposition,
  type QueueLead,
  type ScriptContent,
} from '@/components/crc/CallQueueView'


export default async function CallQueuePage() {
  let dispositions: Disposition[] = []
  let script: ScriptContent = {
    accroche: '',
    questions_qualification: [],
    objections: [],
    closing_rdv: '',
  }
  let lead: QueueLead | null = null
  let reason = 'Aucun lead disponible dans la file'

  if (isSupabaseConfigured()) {
    const supabase = await createClient()

    const [{ data: dispositionsData }, { data: scriptsData }] = await Promise.all([
      supabase.from('call_dispositions').select('*').eq('actif', true).order('ordre', { ascending: true }),
      supabase.from('call_scripts').select('*').eq('actif', true).limit(1),
    ])

    if (dispositionsData && dispositionsData.length > 0) {
      dispositions = dispositionsData as Disposition[]
    }

    const contenu = scriptsData?.[0]?.contenu as Record<string, unknown> | undefined
    if (contenu) {
      script = contenu as unknown as ScriptContent
    }

    try {
      const next = await fetchNextLeadForAgent()
      lead = (next.lead as QueueLead | null) ?? null
      reason = next.reason
    } catch {
      lead = null
      reason = 'Impossible de charger la file d’appels'
    }
  }

  return (
    <CallQueueView
      initialLead={lead}
      initialReason={reason}
      dispositions={dispositions}
      script={script}
    />
  )
}
