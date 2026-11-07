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

function demoAppointment(token: string): PublicAppointment {
  const debut = new Date()
  debut.setDate(debut.getDate() + 1)
  debut.setHours(10, 30, 0, 0)
  const fin = new Date(debut.getTime() + 60 * 60 * 1000)

  return {
    id: 'demo-rdv-public',
    debut: debut.toISOString(),
    fin: fin.toISOString(),
    type: 'showroom',
    statut: 'planifie',
    token_public: token,
    site: {
      nom: 'Showroom Casa Centre',
      ville: 'Casablanca',
      adresse: 'Boulevard Zerktouni, Casablanca',
      telephone: '+212522000000',
    },
    lead: { prenom: 'Youssef', nom: 'Bennani', telephone: '+212661234567' },
    commercial: { prenom: 'Hassan', nom: 'Alami' },
    notes_crc: 'Essai du SUV hybride.',
  }
}

export default async function PublicAppointmentPage({
  params,
}: {
  params: { token: string }
}) {
  const token = params.token

  if (!isSupabaseConfigured() || token.startsWith('demo-')) {
    return <PublicAppointmentView appointment={demoAppointment(token)} isDemo />
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