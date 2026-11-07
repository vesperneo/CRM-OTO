'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  appointmentCreateSchema,
  appointmentRescheduleSchema,
  appointmentStatusUpdateSchema,
  AppointmentCreateInput,
  AppointmentStatusUpdateInput,
} from './schemas'
import { buildAppointmentEmail, sendEmail } from '@/lib/email/resend'
import {
  renderWhatsAppTemplate,
  sendWhatsAppMessage,
} from '@/lib/whatsapp/provider'
import {
  createGoogleEvent,
  deleteGoogleEvent,
  isGoogleCalendarConfigured,
  updateGoogleEvent,
} from '@/lib/google/calendar'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function j1TaskEcheance(debutIso: string): string {
  const debut = new Date(debutIso)
  const j1 = new Date(debut)
  j1.setDate(j1.getDate() - 1)
  j1.setHours(9, 0, 0, 0)

  // Si le créneau J-1 est déjà passé, programmer dans 30 minutes.
  if (j1.getTime() < Date.now()) {
    return addMinutes(new Date(), 30).toISOString()
  }
  return j1.toISOString()
}

function formatDateHeure(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Casablanca',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

async function creerTacheConfirmation(
  supabase: any,
  leadId: string,
  debutIso: string,
  responsableId: string | null
) {
  await supabase.from('tasks_relances').insert({
    lead_id: leadId,
    assigne_a: responsableId,
    type: 'confirmation_rdv',
    echeance: j1TaskEcheance(debutIso),
    statut: 'en_attente',
    notes: 'Confirmation du rendez-vous (J-1)',
    regle_origine: 'confirmation_j1',
  })
}

async function logMessage(
  supabase: any,
  payload: {
    lead_id: string | null
    appointment_id?: string | null
    canal: 'whatsapp' | 'sms' | 'email'
    destinataire: string
    contenu: string
    statut: string
    provider: string
    provider_message_id?: string | null
    erreur?: string | null
    envoye_par?: string | null
  }
) {
  try {
    await supabase.from('message_logs').insert(payload)
  } catch {
    // Table absente si la migration Phase 3 n'est pas encore appliquée.
  }
}

async function notifierCreation(
  supabase: any,
  appointment: any,
  lead: any,
  site: any
) {
  const token = appointment.token_public
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const lien = `${appUrl}/rdv/${token}`
  const dateHeure = formatDateHeure(appointment.debut)
  const prenom = lead?.prenom ?? lead?.nom ?? ''
  const siteNom = site?.nom ?? 'Otoclic'
  const { date, heure } = splitDateHeure(appointment.debut)

  // Email de confirmation
  if (lead?.email) {
    const mail = buildAppointmentEmail({
      prenom,
      date,
      heure,
      siteNom,
      siteAdresse: site?.adresse,
      siteVille: site?.ville,
      siteTelephone: site?.telephone,
      tokenPublic: token,
      appUrl,
    })
    const res = await sendEmail({ to: lead.email, ...mail })
    await logMessage(supabase, {
      lead_id: lead.id,
      appointment_id: appointment.id,
      canal: 'email',
      destinataire: lead.email,
      contenu: mail.text,
      statut: res.success ? (res.demo ? 'queued' : 'sent') : 'failed',
      provider: res.provider,
      provider_message_id: res.messageId ?? null,
      erreur: res.error ?? null,
    })
  }

  // WhatsApp de confirmation
  const telephone = lead?.whatsapp ?? lead?.telephone
  if (telephone) {
    const contenu = renderWhatsAppTemplate(
      'Bonjour {{prenom}}, votre rendez-vous Otoclic {{site}} est prévu le {{date}} à {{heure}}. Merci de confirmer votre présence : {{lien}}',
      {
        prenom,
        site: siteNom,
        date,
        heure,
        lien,
      }
    )
    const res = await sendWhatsAppMessage({ to: telephone, body: contenu })
    await logMessage(supabase, {
      lead_id: lead.id,
      appointment_id: appointment.id,
      canal: 'whatsapp',
      destinataire: telephone,
      contenu,
      statut: res.success ? (res.demo ? 'queued' : 'sent') : 'failed',
      provider: res.provider,
      provider_message_id: res.messageId ?? null,
      erreur: res.error ?? null,
    })
  }

  return { dateHeure, lien }
}

function splitDateHeure(iso: string): { date: string; heure: string } {
  try {
    const d = new Date(iso)
    const date = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      timeZone: 'Africa/Casablanca',
    }).format(d)
    const heure = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Casablanca',
    }).format(d)
    return { date, heure }
  } catch {
    return { date: iso, heure: '' }
  }
}

function revalidateAppointments(leadId?: string) {
  revalidatePath('/rendez-vous')
  revalidatePath('/dashboard')
  revalidatePath('/taches')
  revalidatePath('/leads')
  if (leadId) revalidatePath(`/leads/${leadId}`)
}

// ------------------------------------------------------------
// Création d'un rendez-vous
// ------------------------------------------------------------

export async function createAppointment(data: AppointmentCreateInput) {
  const parsed = appointmentCreateSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const debut = new Date(parsed.data.debut)
  if (Number.isNaN(debut.getTime())) {
    return { success: false, error: 'Date de début invalide' }
  }
  const fin = addMinutes(debut, parsed.data.duree_minutes)
  const debutIso = debut.toISOString()
  const finIso = fin.toISOString()

  // Vérification des conflits sur le même site
  if (parsed.data.site_id) {
    const { data: conflicts } = await (supabase.from('appointments') as any)
      .select('id')
      .eq('site_id', parsed.data.site_id)
      .in('statut', ['planifie', 'confirme'])
      .lt('debut', finIso)
      .gt('fin', debutIso)
      .limit(1)

    if (conflicts && conflicts.length > 0) {
      return {
        success: false,
        error: 'Ce créneau chevauche un autre rendez-vous sur ce site.',
      }
    }
  }

  const { data: appointment, error } = await (supabase.from('appointments') as any)
    .insert({
      lead_id: parsed.data.lead_id,
      pris_par_id: user?.id ?? null,
      assigne_a_id: parsed.data.assigne_a_id ?? null,
      site_id: parsed.data.site_id ?? null,
      debut: debutIso,
      fin: finIso,
      type: parsed.data.type,
      statut: 'planifie',
      notes_crc: parsed.data.notes_crc ?? null,
      cree_par: user?.id ?? null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Mettre à jour le lead
  await (supabase.from('leads') as any)
    .update({
      statut: 'rdv_planifie',
      prochaine_tentative_a: null,
    })
    .eq('id', parsed.data.lead_id)

  const { data: lead } = await (supabase.from('leads') as any)
    .select('id, nom, prenom, telephone, whatsapp, email, site_prefere_id')
    .eq('id', parsed.data.lead_id)
    .single()

  const { data: site } = parsed.data.site_id
    ? await (supabase.from('sites') as any).select('*').eq('id', parsed.data.site_id).single()
    : { data: null }

  await (supabase.from('activities') as any).insert({
    lead_id: parsed.data.lead_id,
    type: 'rdv',
    contenu: {
      action: 'creation',
      rdv_id: appointment.id,
      debut: debutIso,
      site: site?.nom ?? null,
      type: parsed.data.type,
    },
    auteur_id: user?.id ?? null,
  })

  await creerTacheConfirmation(supabase, parsed.data.lead_id, debutIso, user?.id ?? null)

  // Synchronisation Google Calendar (best effort)
  if (isGoogleCalendarConfigured()) {
    const g = await createGoogleEvent({
      summary: `RDV Otoclic — ${lead?.prenom ?? ''} ${lead?.nom ?? ''}`.trim(),
      description: parsed.data.notes_crc ?? 'Rendez-vous créé depuis Otoclic CRM',
      location: [site?.adresse, site?.ville].filter(Boolean).join(', '),
      start: debutIso,
      end: finIso,
    })
    if (g.success && g.eventId) {
      await (supabase.from('appointments') as any)
        .update({ google_event_id: g.eventId })
        .eq('id', appointment.id)
    }
  }

  // Notifications lead (email + WhatsApp)
  await notifierCreation(supabase, appointment, lead, site)

  revalidateAppointments(parsed.data.lead_id)
  return { success: true, appointment }
}

// ------------------------------------------------------------
// Confirmation CRC J-1
// ------------------------------------------------------------

export async function confirmAppointment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: appointment } = await (supabase.from('appointments') as any)
    .select('*')
    .eq('id', id)
    .single()

  if (!appointment) return { success: false, error: 'Rendez-vous introuvable' }

  const { error } = await (supabase.from('appointments') as any)
    .update({
      statut: 'confirme',
      confirme_par_crc_le: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  await (supabase.from('leads') as any)
    .update({ statut: 'rdv_confirme' })
    .eq('id', appointment.lead_id)

  await (supabase.from('tasks_relances') as any)
    .update({ statut: 'terminee', termine_a: new Date().toISOString() })
    .eq('lead_id', appointment.lead_id)
    .eq('type', 'confirmation_rdv')
    .eq('statut', 'en_attente')

  await (supabase.from('activities') as any).insert({
    lead_id: appointment.lead_id,
    type: 'rdv',
    contenu: {
      action: 'confirmation_crc',
      rdv_id: appointment.id,
      texte: 'Rendez-vous confirmé par le CRC (J-1)',
    },
    auteur_id: user?.id ?? null,
  })

  revalidateAppointments(appointment.lead_id)
  return { success: true }
}

// ------------------------------------------------------------
// Résultat commercial / changement de statut
// ------------------------------------------------------------

export async function updateAppointmentStatus(data: AppointmentStatusUpdateInput) {
  const parsed = appointmentStatusUpdateSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: appointment } = await (supabase.from('appointments') as any)
    .select('*')
    .eq('id', parsed.data.id)
    .single()

  if (!appointment) return { success: false, error: 'Rendez-vous introuvable' }

  const { error } = await (supabase.from('appointments') as any)
    .update({
      statut: parsed.data.statut,
      resultat_commercial:
        parsed.data.resultat_commercial ?? appointment.resultat_commercial,
      notes_commercial:
        parsed.data.notes_commercial ?? appointment.notes_commercial,
    })
    .eq('id', parsed.data.id)

  if (error) return { success: false, error: error.message }

  let nouveauStatutLead: string | null = null
  if (parsed.data.statut === 'effectue') nouveauStatutLead = 'rdv_effectue'
  else if (parsed.data.statut === 'absent') nouveauStatutLead = 'a_rappeler'
  else if (parsed.data.statut === 'annule') nouveauStatutLead = 'a_rappeler'
  else if (parsed.data.statut === 'replanifie') nouveauStatutLead = 'rdv_planifie'

  if (nouveauStatutLead) {
    await (supabase.from('leads') as any)
      .update({ statut: nouveauStatutLead })
      .eq('id', appointment.lead_id)
  }

  // Absent / annulé → retour automatique dans la file CRC
  if (parsed.data.statut === 'absent' || parsed.data.statut === 'annule') {
    await (supabase.from('tasks_relances') as any).insert({
      lead_id: appointment.lead_id,
      assigne_a: appointment.pris_par_id ?? user?.id ?? null,
      type: 'rappel_appel',
      echeance: addMinutes(new Date(), 60).toISOString(),
      statut: 'en_attente',
      notes:
        parsed.data.statut === 'absent'
          ? 'RDV non honoré (absent) — reprogrammer avec le prospect'
          : 'RDV annulé — reprogrammer avec le prospect',
      regle_origine: 'rdv_absent',
    })
  }

  await (supabase.from('activities') as any).insert({
    lead_id: appointment.lead_id,
    type: 'rdv',
    contenu: {
      action: 'resultat_commercial',
      rdv_id: appointment.id,
      statut: parsed.data.statut,
      resultat: parsed.data.resultat_commercial ?? null,
    },
    auteur_id: user?.id ?? null,
  })

  revalidateAppointments(appointment.lead_id)
  return { success: true }
}

// ------------------------------------------------------------
// Reprogrammation
// ------------------------------------------------------------

export async function rescheduleAppointment(
  id: string,
  debutInput: string,
  dureeMinutes = 60
) {
  const parsed = appointmentRescheduleSchema.safeParse({
    id,
    debut: debutInput,
    duree_minutes: dureeMinutes,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: appointment } = await (supabase.from('appointments') as any)
    .select('*')
    .eq('id', parsed.data.id)
    .single()

  if (!appointment) return { success: false, error: 'Rendez-vous introuvable' }

  const debut = new Date(parsed.data.debut)
  if (Number.isNaN(debut.getTime())) {
    return { success: false, error: 'Date de reprogrammation invalide' }
  }
  const fin = addMinutes(debut, parsed.data.duree_minutes)
  const debutIso = debut.toISOString()
  const finIso = fin.toISOString()

  if (appointment.site_id) {
    const { data: conflicts } = await (supabase.from('appointments') as any)
      .select('id')
      .eq('site_id', appointment.site_id)
      .neq('id', appointment.id)
      .in('statut', ['planifie', 'confirme'])
      .lt('debut', finIso)
      .gt('fin', debutIso)
      .limit(1)

    if (conflicts && conflicts.length > 0) {
      return {
        success: false,
        error: 'Ce créneau chevauche un autre rendez-vous sur ce site.',
      }
    }
  }

  const { error } = await (supabase.from('appointments') as any)
    .update({
      debut: debutIso,
      fin: finIso,
      statut: 'planifie',
      confirme_par_crc_le: null,
      rappel_j1_envoye: false,
      rappel_h2_envoye: false,
    })
    .eq('id', parsed.data.id)

  if (error) return { success: false, error: error.message }

  await (supabase.from('leads') as any)
    .update({ statut: 'rdv_planifie' })
    .eq('id', appointment.lead_id)

  await (supabase.from('tasks_relances') as any)
    .update({ statut: 'annulee' })
    .eq('lead_id', appointment.lead_id)
    .eq('type', 'confirmation_rdv')
    .eq('statut', 'en_attente')

  await creerTacheConfirmation(
    supabase,
    appointment.lead_id,
    debutIso,
    appointment.pris_par_id ?? user?.id ?? null
  )

  if (appointment.google_event_id) {
    await updateGoogleEvent(appointment.google_event_id, {
      start: debutIso,
      end: finIso,
    })
  }

  await (supabase.from('activities') as any).insert({
    lead_id: appointment.lead_id,
    type: 'rdv',
    contenu: {
      action: 'reprogrammation',
      rdv_id: appointment.id,
      ancienne_date: appointment.debut,
      nouvelle_date: debutIso,
    },
    auteur_id: user?.id ?? null,
  })

  revalidateAppointments(appointment.lead_id)
  return { success: true }
}

// ------------------------------------------------------------
// Annulation (usage interne)
// ------------------------------------------------------------

export async function cancelAppointment(id: string, motif?: string) {
  return updateAppointmentStatus({
    id,
    statut: 'annule',
    notes_commercial: motif,
  })
}

// ------------------------------------------------------------
// Synchronisation Google Calendar manuelle
// ------------------------------------------------------------

export async function syncAppointmentToGoogle(id: string) {
  const supabase = await createClient()

  const { data: appointment } = await (supabase.from('appointments') as any)
    .select('*, lead:leads(nom, prenom), site:sites(nom, ville, adresse)')
    .eq('id', id)
    .single()

  if (!appointment) return { success: false, error: 'Rendez-vous introuvable' }
  if (!isGoogleCalendarConfigured()) {
    return {
      success: false,
      error:
        'Google Calendar n’est pas configuré (GOOGLE_CALENDAR_ACCESS_TOKEN manquant).',
    }
  }

  if (appointment.google_event_id) {
    const res = await updateGoogleEvent(appointment.google_event_id, {
      summary: `RDV Otoclic — ${appointment.lead?.prenom ?? ''} ${appointment.lead?.nom ?? ''}`.trim(),
      start: appointment.debut,
      end: appointment.fin,
    })
    revalidateAppointments(appointment.lead_id)
    return res.success
      ? { success: true, eventId: appointment.google_event_id }
      : { success: false, error: res.error }
  }

  const res = await createGoogleEvent({
    summary: `RDV Otoclic — ${appointment.lead?.prenom ?? ''} ${appointment.lead?.nom ?? ''}`.trim(),
    description: appointment.notes_crc ?? undefined,
    location: [appointment.site?.adresse, appointment.site?.ville]
      .filter(Boolean)
      .join(', '),
    start: appointment.debut,
    end: appointment.fin,
  })

  if (!res.success || !res.eventId) {
    return { success: false, error: res.error ?? 'Synchronisation impossible' }
  }

  await (supabase.from('appointments') as any)
    .update({ google_event_id: res.eventId })
    .eq('id', id)

  revalidateAppointments(appointment.lead_id)
  return { success: true, eventId: res.eventId }
}

// ------------------------------------------------------------
// Suppression d'un RDV
// ------------------------------------------------------------

export async function deleteAppointment(id: string) {
  const supabase = await createClient()

  const { data: appointment } = await (supabase.from('appointments') as any)
    .select('lead_id, google_event_id')
    .eq('id', id)
    .single()

  if (appointment?.google_event_id) {
    await deleteGoogleEvent(appointment.google_event_id)
  }

  const { error } = await (supabase.from('appointments') as any)
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidateAppointments(appointment?.lead_id)
  return { success: true }
}