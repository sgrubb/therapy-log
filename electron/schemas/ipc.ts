import { z } from "zod";
import {
  SessionDay,
  Outcome,
  SessionStatus,
  SessionType,
  DeliveryMethod,
  MissedReason,
} from "../../generated/prisma/client";

// ── Zod schemas for data received FROM the renderer (IPC inputs) ───────────
// Validates and transforms incoming data before it reaches Prisma.

// ── Therapists ─────────────────────────────────────────────────────────────

export const therapistCreateSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  is_admin: z.boolean().optional(),
});

export const therapistUpdateSchema = z.object({
  updated_at: z.coerce.date(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  is_admin: z.boolean().optional(),
});

// ── Clients ────────────────────────────────────────────────────────────────

export const clientCreateSchema = z.object({
  hospital_number: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  dob: z.coerce.date(),
  start_date: z.coerce.date(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  session_day: z.enum(SessionDay).nullable().optional(),
  session_time: z.string().nullable().optional(),
  session_duration: z.number().int().positive().nullable().optional(),
  session_delivery_method: z.enum(DeliveryMethod).nullable().optional(),
  therapist_id: z.number().int().positive(),
  closed_date: z.coerce.date().nullable().optional(),
  pre_score: z.number().nullable().optional(),
  post_score: z.number().nullable().optional(),
  outcome: z.enum(Outcome).nullable().optional(),
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
  session_day: z.enum(SessionDay).nullable().optional(),
  session_time: z.string().nullable().optional(),
  session_duration: z.number().int().positive().nullable().optional(),
  session_delivery_method: z.enum(DeliveryMethod).nullable().optional(),
  therapist_id: z.number().int().positive().optional(),
  closed_date: z.coerce.date().nullable().optional(),
  pre_score: z.number().nullable().optional(),
  post_score: z.number().nullable().optional(),
  outcome: z.enum(Outcome).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const clientCloseSchema = z.object({
  post_score: z.number().nullable().optional(),
  outcome: z.enum(Outcome),
  closed_date: z.coerce.date(),
  notes: z.string().nullable().optional(),
});

export const clientReopenSchema = z.object({
  notes: z.string().nullable().optional(),
});

// ── Sessions ───────────────────────────────────────────────────────────────

export const sessionCreateSchema = z.object({
  client_id: z.number().int().positive(),
  therapist_id: z.number().int().positive(),
  scheduled_at: z.coerce.date(),
  occurred_at: z.coerce.date().nullable().optional(),
  duration: z.number().int().positive(),
  status: z.enum(SessionStatus),
  session_type: z.enum(SessionType),
  delivery_method: z.enum(DeliveryMethod),
  missed_reason: z.enum(MissedReason).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const sessionUpdateSchema = z.object({
  updated_at: z.coerce.date(),
  client_id: z.number().int().positive().optional(),
  therapist_id: z.number().int().positive().optional(),
  scheduled_at: z.coerce.date().optional(),
  occurred_at: z.coerce.date().nullable().optional(),
  duration: z.number().int().positive().optional(),
  status: z.enum(SessionStatus).optional(),
  session_type: z.enum(SessionType).optional(),
  delivery_method: z.enum(DeliveryMethod).optional(),
  missed_reason: z.enum(MissedReason).nullable().optional(),
  notes: z.string().nullable().optional(),
});
