import { z } from "zod";
import { therapistSchema } from "@shared/schemas/therapists";
import {
  SessionDay,
  Outcome,
  DeliveryMethod,
  ClientStatus,
  SortDir,
} from "@shared/types/enums";

// ── Response schemas ────────────────────────────────────────────────────────

export const clientBaseSchema = z.object({
  id: z.number(),
  hospital_number: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  dob: z.date(),
  start_date: z.date(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  session_day: z.enum(Object.values(SessionDay) as [SessionDay, ...SessionDay[]]).nullable(),
  session_time: z.string().nullable(),
  session_duration: z.number().nullable(),
  session_delivery_method: z.enum(Object.values(DeliveryMethod) as [DeliveryMethod, ...DeliveryMethod[]]).nullable(),
  therapist_id: z.number(),
  closed_date: z.date().nullable(),
  pre_score: z.number().nullable(),
  post_score: z.number().nullable(),
  outcome: z.enum(Object.values(Outcome) as [Outcome, ...Outcome[]]).nullable(),
  notes: z.string().nullable(),
  updated_at: z.date(),
});

export const clientSchema = clientBaseSchema;

export const clientWithTherapistSchema = clientBaseSchema.extend({
  therapist: therapistSchema,
});

// ── Request schemas ─────────────────────────────────────────────────────────

export const clientCreateSchema = z.object({
  hospital_number: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  dob: z.coerce.date(),
  start_date: z.coerce.date(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  session_day: z.enum(Object.values(SessionDay) as [SessionDay, ...SessionDay[]]).nullable().optional(),
  session_time: z.string().nullable().optional(),
  session_duration: z.number().int().positive().nullable().optional(),
  session_delivery_method: z.enum(Object.values(DeliveryMethod) as [DeliveryMethod, ...DeliveryMethod[]]).nullable().optional(),
  therapist_id: z.number().int().positive(),
  closed_date: z.coerce.date().nullable().optional(),
  pre_score: z.number().nullable().optional(),
  post_score: z.number().nullable().optional(),
  outcome: z.enum(Object.values(Outcome) as [Outcome, ...Outcome[]]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const clientUpdateSchema = z.object({
  updated_at: z.coerce.date(),
  hospital_number: z.string().min(1).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  dob: z.coerce.date().optional(),
  start_date: z.coerce.date().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  session_day: z.enum(Object.values(SessionDay) as [SessionDay, ...SessionDay[]]).nullable().optional(),
  session_time: z.string().nullable().optional(),
  session_duration: z.number().int().positive().nullable().optional(),
  session_delivery_method: z.enum(Object.values(DeliveryMethod) as [DeliveryMethod, ...DeliveryMethod[]]).nullable().optional(),
  therapist_id: z.number().int().positive().optional(),
  closed_date: z.coerce.date().nullable().optional(),
  pre_score: z.number().nullable().optional(),
  post_score: z.number().nullable().optional(),
  outcome: z.enum(Object.values(Outcome) as [Outcome, ...Outcome[]]).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const clientCloseSchema = z.object({
  post_score: z.number().nullable().optional(),
  outcome: z.enum(Object.values(Outcome) as [Outcome, ...Outcome[]]),
  closed_date: z.coerce.date(),
  notes: z.string().nullable().optional(),
});

export const clientReopenSchema = z.object({
  notes: z.string().nullable().optional(),
});

export const clientListAllParamsSchema = z.object({
  therapistId: z.number().int().positive().optional(),
  openOnly: z.boolean().optional(),
});

export const clientListParamsSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(500),
  status: z.enum(Object.values(ClientStatus) as [ClientStatus, ...ClientStatus[]]).optional().default(ClientStatus.All),
  therapistId: z.number().int().positive().nullable().optional(),
  search: z.string().optional(),
  sortKey: z.string(),
  sortDir: z.enum([SortDir.Asc, SortDir.Desc] as const),
});
