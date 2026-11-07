import { z } from 'zod'

// Helper de validation de téléphone marocain ou international
export const phoneRegex = /^(?:\+212|0|212)[5-7]\d{8}$/

export const leadCreateSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().optional().nullable(),
  telephone: z
    .string()
    .min(9, 'Numéro de téléphone invalide')
    .refine((val) => {
      const clean = val.replace(/[\s.-]/g, '')
      return phoneRegex.test(clean) || clean.length >= 9
    }, 'Format de téléphone invalide (ex: 0661234567 ou +212661234567)'),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email('Format email invalide').optional().or(z.literal('')).nullable(),
  ville: z.string().optional().nullable(),
  site_prefere_id: z.string().uuid().optional().nullable(),
  source_id: z.string().uuid().optional().nullable(),
  campagne: z.string().optional().nullable(),
  interet_produit: z.string().optional().nullable(),
  budget: z.coerce.number().positive('Le budget doit être positif').optional().nullable(),
  delai_achat: z.string().optional().nullable(),
  besoin_details: z.string().optional().nullable(),
  reprise_vehicule: z.boolean().optional().nullable(),
  financement: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable(),
  consentement_contact: z.boolean().default(true),
})

export type LeadCreateInput = z.infer<typeof leadCreateSchema>

export const leadUpdateSchema = leadCreateSchema.partial().extend({
  id: z.string().uuid(),
  statut: z.string().optional(),
  perdu_raison: z.string().optional().nullable(),
  assigne_crc_a: z.string().uuid().optional().nullable(),
  assigne_commercial_a: z.string().uuid().optional().nullable(),
})

export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>

// Fin d'appel / Disposition
export const callLogSchema = z.object({
  lead_id: z.string().uuid(),
  disposition_id: z.string().uuid(),
  notes: z.string().optional().nullable(),
  duree_secondes: z.number().int().nonnegative().optional(),
  reponses_qualification: z
    .object({
      budget: z.coerce.number().optional().nullable(),
      delai_achat: z.string().optional().nullable(),
      reprise_vehicule: z.boolean().optional().nullable(),
      financement: z.boolean().optional().nullable(),
      modele_actuel: z.string().optional().nullable(),
      besoin_details: z.string().optional().nullable(),
    })
    .optional(),
  // Rappel programmé éventuel
  rappel_date: z.string().optional().nullable(),
  rappel_heure: z.string().optional().nullable(),
  rappel_note: z.string().optional().nullable(),
})

export type CallLogInput = z.infer<typeof callLogSchema>

// Ajout de note rapide sur la fiche
export const noteCreateSchema = z.object({
  lead_id: z.string().uuid(),
  texte: z.string().min(1, 'La note ne peut pas être vide'),
})

// Tâche de relance
export const taskCreateSchema = z.object({
  lead_id: z.string().uuid(),
  type: z.enum(['rappel_appel', 'whatsapp', 'email', 'confirmation_rdv', 'reactivation', 'suivi_commercial']),
  echeance: z.string().min(1, "L'échéance est requise"),
  notes: z.string().optional().nullable(),
  assigne_a: z.string().uuid().optional().nullable(),
})

