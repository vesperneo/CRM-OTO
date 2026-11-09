import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/utils'
import PublicAppointmentView, {
  type PublicAppointment,
} from '@/components/appointments/PublicAppointmentView'

export const metadata = {
  title: 'Confirmer mon rendez-vous — Otoclic',
  description: 'Confirmez ou annulez votre rendez-vous showroom Otoclic.',
}

export default async function PublicAppointmentPage({
  params,
}: {
  params: { token: string }
}) {
  const token = params.token

  if (!isSupabaseConfigured()) {
    return notFound()
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_appointment_by_token', {
    p_token: token,
  })

  if (error || !data) {
    notFound()
  }

  return (
    <PublicAppointmentView appointment={data as unknown as PublicAppointment} />
  )
}