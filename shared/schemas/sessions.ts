import { z } from "zod";
import { clientBaseSchema } from "@shared/schemas/clients";
import { therapistSchema } from "@shared/schemas/therapists";
import {
  SessionStatus,
  SessionType,
  DeliveryMethod,
  MissedReason,
  SortDir,
} from "@shared/types/enums";

// ── Response schemas ────────────────────────────────────────────────────────

export const sessionBaseSchema = z.object({
  id: z.number(),
  client_id: z.number(),
  therapist_id: z.number(),
  scheduled_at: z.date(),
  occurred_at: z.date().nullable(),
  duration: z.number(),
  status: z.enum(Object.values(SessionStatus) as [SessionStatus, ...SessionStatus[]]),
  session_type: z.enum(Object.values(SessionType) as [SessionType, ...SessionType[]]),
  delivery_method: z.enum(Object.values(DeliveryMethod) as [DeliveryMethod, ...DeliveryMethod[]]),
  missed_reason: z.enum(Object.values(MissedReason) as [MissedReason, ...MissedReason[]]).nullable(),
  notes: z.string().nullable(),
  updated_at: z.date(),
});

export const sessionSchema = sessionBaseSchema;

export const sessionWithClientAndTherapistSchema = sessionBaseSchema.extend({
  client: clientBaseSchema,
  therapist: therapistSchema,
});

// Minimal person shape for expected sessions — derived from the canonical schemas
// so the field names stay in sync, without over-fetching full client/therapist data.
const expectedSessionClientSchema = clientBaseSchema.pick({
  id: true,
  first_name: true,
  last_name: true,
});

const expectedSessionTherapistSchema = therapistSchema.pick({
  id: true,
  first_name: true,
  last_name: true,
});

export const expectedSessionSchema = z.object({
  id: z.string(),
  client_id: z.number(),
  therapist_id: z.number(),
  scheduled_at: z.date(),
  duration: z.number(),
  client: expectedSessionClientSchema,
  therapist: expectedSessionTherapistSchema,
});

// ── Request schemas ─────────────────────────────────────────────────────────

export const sessionCreateSchema = z.object({
  client_id: z.number().int().positive(),
  therapist_id: z.number().int().positive(),
  scheduled_at: z.coerce.date(),
  occurred_at: z.coerce.date().nullable().optional(),
  duration: z.number().int().positive(),
  status: z.enum(Object.values(SessionStatus) as [SessionStatus, ...SessionStatus[]]),
  session_type: z.enum(Object.values(SessionType) as [SessionType, ...SessionType[]]),
  delivery_method: z.enum(Object.values(DeliveryMethod) as [DeliveryMethod, ...DeliveryMethod[]]),
  missed_reason: z.enum(Object.values(MissedReason) as [MissedReason, ...MissedReason[]]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const sessionUpdateSchema = z.object({
  updated_at: z.coerce.date(),
  client_id: z.number().int().positive().optional(),
  therapist_id: z.number().int().positive().optional(),
  scheduled_at: z.coerce.date().optional(),
  occurred_at: z.coerce.date().nullable().optional(),
  duration: z.number().int().positive().optional(),
  status: z.enum(Object.values(SessionStatus) as [SessionStatus, ...SessionStatus[]]).optional(),
  session_type: z.enum(Object.values(SessionType) as [SessionType, ...SessionType[]]).optional(),
  delivery_method: z.enum(Object.values(DeliveryMethod) as [DeliveryMethod, ...DeliveryMethod[]]).optional(),
  missed_reason: z.enum(Object.values(MissedReason) as [MissedReason, ...MissedReason[]]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const sessionFiltersSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  therapistIds: z.array(z.number().int().positive()).optional(),
  clientId: z.number().int().positive().optional(),
  status: z.string().optional(),
});

export const sessionListParamsSchema = sessionFiltersSchema.extend({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(200),
  sortKey: z.string(),
  sortDir: z.enum([SortDir.Asc, SortDir.Desc] as const),
});

export const sessionListRangeParamsSchema = sessionFiltersSchema.extend({
  sortKey: z.string().optional(),
  sortDir: z.enum([SortDir.Asc, SortDir.Desc] as const).optional(),
});

export const sessionListExpectedParamsSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  therapistIds: z.array(z.number().int().positive()).optional(),
  clientId: z.number().int().positive().optional(),
  sortKey: z.string(),
  sortDir: z.enum([SortDir.Asc, SortDir.Desc] as const),
});
