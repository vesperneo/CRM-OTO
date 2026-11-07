import { z } from 'zod'

export const appointmentTypeEnum = z.enum(['showroom', 'appel', 'visio'])

export const appointmentStatusEnum = z.enum([
  'planifie',
  'confirme',
  'effectue',
  'absent',
  'annule',
  'replanifie',
])

export const appointmentCreateSchema = z.object({
  lead_id: z.string().uuid('Lead invalide'),
  site_id: z.string().uuid().optional().nullable(),
  assigne_a_id: z.string().uuid().optional().nullable(),
  type: appointmentTypeEnum.default('showroom'),
  debut: z.string().min(1, 'La date de début est requise'),
  duree_minutes: z.coerce.number().int().min(15).max(480).default(60),
  notes_crc: z.string().optional().nullable(),
})

export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>

export const appointmentRescheduleSchema = z.object({
  id: z.string().uuid(),
  debut: z.string().min(1, 'La nouvelle date est requise'),
  duree_minutes: z.coerce.number().int().min(15).max(480).default(60),
})

export type AppointmentRescheduleInput = z.infer<typeof appointmentRescheduleSchema>

export const appointmentStatusUpdateSchema = z.object({
  id: z.string().uuid(),
  statut: appointmentStatusEnum,
  resultat_commercial: z.string().optional().nullable(),
  notes_commercial: z.string().optional().nullable(),
})

export type AppointmentStatusUpdateInput = z.infer<
  typeof appointmentStatusUpdateSchema
>