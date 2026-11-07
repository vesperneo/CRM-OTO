'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { callLogSchema, CallLogInput } from '@/features/leads/schemas'
import { getCadencePlan, shouldSendWhatsApp } from '@/lib/cadence'
import { renderWhatsAppTemplate, sendWhatsAppMessage } from '@/lib/whatsapp/provider'
import { initiateTwilioCall, isTwilioConfigured } from '@/lib/telephony/twilio'

export async function fetchNextLeadForAgent() {
  const supabase = await createClient()

  const now = new Date().toISOString()

  // 1. Priorité 1 : Tâches de rappel téléphonique assignées ou échues
  const { data: dueCallback } = await (supabase.from('tasks_relances') as any)
    .select('*, lead:leads(*)')
    .eq('type', 'rappel_appel')
    .eq('statut', 'en_attente')
    .lte('echeance', now)
    .order('echeance', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (dueCallback?.lead) {
    return {
      lead: dueCallback.lead,
      reason: 'Rappel téléphonique programmé à cette heure',
      taskId: dueCallback.id,
    }
  }

  // 2. Priorité 2 : Nouveaux leads arrivés (SLA 15 min)
  const { data: newLead } = await (supabase.from('leads') as any)
    .select('*')
    .eq('statut', 'nouveau')
    .or(`verrouille_jusqu_a.is.null,verrouille_jusqu_a.lte.${now}`)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (newLead) {
    return {
      lead: newLead,
      reason: 'Nouveau lead entrant prioritaire',
    }
  }

  // 3. Priorité 3 : Leads en cadence d'appel dont la prochaine tentative est échue
  const { data: cadenceLead } = await (supabase.from('leads') as any)
    .select('*')
    .in('statut', ['a_rappeler', 'en_qualification_crc'])
    .lte('prochaine_tentative_a', now)
    .or(`verrouille_jusqu_a.is.null,verrouille_jusqu_a.lte.${now}`)
    .order('prochaine_tentative_a', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (cadenceLead) {
    return {
      lead: cadenceLead,
      reason: `Tentative d'appel nº ${(cadenceLead.nb_tentatives_appel ?? 0) + 1}`,
    }
  }

  // 4. File commune non assignée
  const { data: fallbackLead } = await (supabase.from('leads') as any)
    .select('*')
    .not('statut', 'in', '("gagne","perdu","doublon","ne_pas_rappeler")')
    .or(`verrouille_jusqu_a.is.null,verrouille_jusqu_a.lte.${now}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    lead: fallbackLead ?? null,
    reason: fallbackLead ? 'File générale CRC' : 'Aucun prospect en attente dans la file',
  }
}

export async function logCallAndDisposition(data: CallLogInput) {
  const parsed = callLogSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Données invalides' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const agentId = user?.id ?? '00000000-0000-0000-0000-000000000001'

  const { lead_id, disposition_id, notes, duree_secondes, reponses_qualification, rappel_date, rappel_heure, rappel_note } = parsed.data

  // 1. Récupérer la disposition
  const { data: disposition } = await (supabase.from('call_dispositions') as any)
    .select('*')
    .eq('id', disposition_id)
    .single()

  const { data: lead } = await (supabase.from('leads') as any)
    .select('*')
    .eq('id', lead_id)
    .single()

  const attempts = (lead?.nb_tentatives_appel ?? 0) + 1
  const now = new Date()

  // 2. Insérer l'appel
  const { data: callRecord, error: callErr } = await (supabase.from('calls') as any)
    .insert({
      lead_id,
      agent_id: agentId,
      direction: 'sortant',
      debut: new Date(now.getTime() - (duree_secondes ?? 30) * 1000).toISOString(),
      fin: now.toISOString(),
      duree_secondes: duree_secondes ?? 30,
      disposition_id,
      notes,
    })
    .select()
    .single()

  if (callErr) return { success: false, error: callErr.message }

  // 3. Sauvegarder les réponses de qualification si présentes
  if (reponses_qualification && Object.keys(reponses_qualification).length > 0) {
    await (supabase.from('qualification_answers') as any).insert({
      lead_id,
      call_id: callRecord?.id ?? null,
      agent_id: agentId,
      reponses: reponses_qualification,
    })

    // Mettre à jour les attributs sur le lead
    await (supabase.from('leads') as any).update({
      budget: reponses_qualification.budget ?? lead?.budget,
      delai_achat: reponses_qualification.delai_achat ?? lead?.delai_achat,
      reprise_vehicule: reponses_qualification.reprise_vehicule ?? lead?.reprise_vehicule,
      financement: reponses_qualification.financement ?? lead?.financement,
    }).eq('id', lead_id)
  }

  // 4. Déterminer le prochain statut, la cadence et les tâches à créer
  let nouveauStatut = lead?.statut ?? 'en_qualification_crc'
  let prochaineTentative: string | null = null
  let prochaineRelance: string | null = null
  const tachesACreer: {
    type: string
    echeance: string
    notes: string
  }[] = []

  if (disposition) {
    const params = (disposition.action_params ?? {}) as Record<string, any>
    if (params.nouveau_statut) {
      nouveauStatut = params.nouveau_statut
    }

    // Relance à délai fixe (ex. disposition « Occupé »)
    if (params.delai_relance_heures) {
      const echeance = new Date(
        now.getTime() + Number(params.delai_relance_heures) * 60 * 60 * 1000
      ).toISOString()
      prochaineTentative = echeance
      prochaineRelance = echeance
      tachesACreer.push({
        type: 'rappel_appel',
        echeance,
        notes: `Relance programmée suite à « ${disposition.libelle} »`,
      })
    }

    // Cadence automatique de tentatives
    if (params.cadence_auto) {
      const plan = getCadencePlan(attempts, now)

      if (plan.exhausted) {
        nouveauStatut = 'injoignable'
        prochaineRelance = plan.reactivationEcheance?.toISOString() ?? null
        if (plan.reactivationEcheance) {
          tachesACreer.push({
            type: 'reactivation',
            echeance: plan.reactivationEcheance.toISOString(),
            notes: 'Réactivation automatique après 5 tentatives sans réponse',
          })
        }
      } else if (plan.step) {
        nouveauStatut = 'a_rappeler'
        prochaineTentative = plan.step.echeance.toISOString()
        prochaineRelance = plan.step.echeance.toISOString()
        tachesACreer.push({
          type: 'rappel_appel',
          echeance: plan.step.echeance.toISOString(),
          notes: `Cadence automatique — tentative ${plan.step.tentative} (${plan.step.label})`,
        })
      }

      // WhatsApp automatique après la 2e tentative sans réponse
      const waPhone = lead?.whatsapp ?? lead?.telephone
      if (shouldSendWhatsApp(attempts) && waPhone) {
        const contenu = renderWhatsAppTemplate(
          'Bonjour {{prenom}}, nous avons tenté de vous joindre au sujet de votre projet {{produit}}. Répondez à ce message ou précisez-nous un créneau pour vous rappeler. — Otoclic',
          {
            prenom: lead?.prenom ?? lead?.nom ?? '',
            produit: lead?.interet_produit ?? 'automobile',
          }
        )

        const wa = await sendWhatsAppMessage({ to: waPhone, body: contenu })

        try {
          await (supabase.from('message_logs') as any).insert({
            lead_id,
            canal: 'whatsapp',
            destinataire: waPhone,
            contenu,
            statut: wa.success ? (wa.demo ? 'queued' : 'sent') : 'failed',
            provider: wa.provider,
            provider_message_id: wa.messageId ?? null,
            erreur: wa.error ?? null,
            envoye_par: agentId,
          })
        } catch {
          // Table message_logs absente : on ignore.
        }

        await (supabase.from('activities') as any).insert({
          lead_id,
          type: 'whatsapp',
          contenu: {
            action: 'whatsapp_automatique',
            tentative: attempts,
            statut: wa.success ? 'envoye' : 'echec',
          },
          auteur_id: agentId,
        })

        if (!wa.success) {
          tachesACreer.push({
            type: 'whatsapp',
            echeance: now.toISOString(),
            notes: 'WhatsApp automatique en échec — relancer manuellement',
          })
        }
      }
    }

    // Demande explicite d'envoi WhatsApp (ex. numéro erroné)
    if (params.envoyer_whatsapp && !shouldSendWhatsApp(attempts)) {
      tachesACreer.push({
        type: 'whatsapp',
        echeance: now.toISOString(),
        notes: `Message WhatsApp à envoyer (${disposition.libelle})`,
      })
    }
  }

  // 5. Programmer un rappel spécifique demandé par le client
  if (rappel_date && rappel_heure) {
    const rappelDateTime = new Date(`${rappel_date}T${rappel_heure}:00`).toISOString()
    nouveauStatut = 'a_rappeler'
    prochaineTentative = rappelDateTime
    prochaineRelance = rappelDateTime

    tachesACreer.push({
      type: 'rappel_appel',
      echeance: rappelDateTime,
      notes: rappel_note ?? `Rappel demandé par le prospect (${notes ?? ''})`,
    })
  }

  // 6. Créer les tâches de relance programmées
  if (tachesACreer.length > 0) {
    await (supabase.from('tasks_relances') as any).insert(
      tachesACreer.map((t) => ({
        lead_id,
        assigne_a: agentId,
        type: t.type,
        echeance: t.echeance,
        statut: 'en_attente',
        notes: t.notes,
        regle_origine: t.type === 'reactivation' ? 'cadence_exhausted' : 'cadence_auto',
      }))
    )
  }

  // 7. Mettre à jour le lead et le déverrouiller
  await (supabase.from('leads') as any)
    .update({
      statut: nouveauStatut,
      nb_tentatives_appel: attempts,
      dernier_contact: now.toISOString(),
      prochaine_tentative_a: prochaineTentative,
      prochaine_relance: prochaineRelance,
      verrouille_par: null,
      verrouille_jusqu_a: null,
    })
    .eq('id', lead_id)

  // 8. Entrée timeline
  await (supabase.from('activities') as any).insert({
    lead_id,
    type: 'appel',
    contenu: {
      call_id: callRecord?.id,
      disposition: disposition?.libelle,
      duree: duree_secondes,
      notes,
      nouveau_statut: nouveauStatut,
      prochaine_tentative: prochaineTentative,
    },
    auteur_id: agentId,
  })

  revalidatePath('/crc/file')
  revalidatePath(`/leads/${lead_id}`)
  revalidatePath('/dashboard')
  revalidatePath('/taches')

  return { success: true, nouveauStatut }
}

// ------------------------------------------------------------
// Click-to-call VoIP (Twilio Programmable Voice)
// ------------------------------------------------------------

export async function startVoipCall(leadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Session expirée.' }
  if (!isTwilioConfigured()) {
    return {
      success: false,
      error:
        'La téléphonie VoIP n’est pas configurée. Utilisez le lien téléphone natif.',
    }
  }

  const { data: lead } = await (supabase.from('leads') as any)
    .select('id, telephone, whatsapp, nom, prenom')
    .eq('id', leadId)
    .single()

  if (!lead?.telephone) {
    return { success: false, error: 'Aucun numéro de téléphone pour ce lead.' }
  }

  const { data: profile } = await (supabase.from('profiles') as any)
    .select('telephone, extension_poste')
    .eq('id', user.id)
    .maybeSingle()

  const result = await initiateTwilioCall({
    to: lead.whatsapp ?? lead.telephone,
    agentNumber: profile?.telephone ?? undefined,
    leadId,
    record: true,
  })

  if (!result.success) {
    await (supabase.from('telephony_events') as any).insert({
      lead_id: leadId,
      agent_id: user.id,
      provider: 'twilio',
      provider_call_id: result.providerCallId ?? null,
      event_type: 'call_failed',
      payload: { error: result.error ?? null },
    })
    return { success: false, error: result.error ?? 'Appel VoIP impossible.' }
  }

  const { data: callRecord } = await (supabase.from('calls') as any)
    .insert({
      lead_id: leadId,
      agent_id: user.id,
      direction: 'sortant',
      debut: new Date().toISOString(),
      provider_call_id: result.providerCallId ?? null,
      notes: 'Appel VoIP initié depuis le CRM',
    })
    .select('id')
    .single()

  await (supabase.from('telephony_events') as any).insert({
    lead_id: leadId,
    call_id: callRecord?.id ?? null,
    agent_id: user.id,
    provider: result.provider,
    provider_call_id: result.providerCallId ?? null,
    event_type: 'call_initiated',
    payload: { status: result.status ?? null },
  })

  await (supabase.from('activities') as any).insert({
    lead_id: leadId,
    type: 'appel',
    contenu: {
      action: 'appel_voip',
      provider: result.provider,
      provider_call_id: result.providerCallId ?? null,
    },
    auteur_id: user.id,
  })

  revalidatePath('/crc/file')
  return { success: true, callId: callRecord?.id ?? null }
}
