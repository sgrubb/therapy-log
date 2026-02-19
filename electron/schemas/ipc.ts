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
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  session_day: z.nativeEnum(SessionDay).nullable().optional(),
  session_time: z.string().nullable().optional(),
  therapist_id: z.number().int().positive(),
  is_closed: z.boolean().optional(),
  pre_score: z.number().nullable().optional(),
  post_score: z.number().nullable().optional(),
  outcome: z.nativeEnum(Outcome).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const clientUpdateSchema = z.object({
  hospital_number: z.string().min(1).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  dob: z.coerce.date().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  session_day: z.nativeEnum(SessionDay).nullable().optional(),
  session_time: z.string().nullable().optional(),
  therapist_id: z.number().int().positive().optional(),
  is_closed: z.boolean().optional(),
  pre_score: z.number().nullable().optional(),
  post_score: z.number().nullable().optional(),
  outcome: z.nativeEnum(Outcome).nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ── Sessions ───────────────────────────────────────────────────────────────

export const sessionCreateSchema = z.object({
  client_id: z.number().int().positive(),
  therapist_id: z.number().int().positive(),
  scheduled_at: z.coerce.date(),
  occurred_at: z.coerce.date().nullable().optional(),
  status: z.nativeEnum(SessionStatus),
  session_type: z.nativeEnum(SessionType),
  delivery_method: z.nativeEnum(DeliveryMethod),
  missed_reason: z.nativeEnum(MissedReason).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const sessionUpdateSchema = z.object({
  client_id: z.number().int().positive().optional(),
  therapist_id: z.number().int().positive().optional(),
  scheduled_at: z.coerce.date().optional(),
  occurred_at: z.coerce.date().nullable().optional(),
  status: z.nativeEnum(SessionStatus).optional(),
  session_type: z.nativeEnum(SessionType).optional(),
  delivery_method: z.nativeEnum(DeliveryMethod).optional(),
  missed_reason: z.nativeEnum(MissedReason).nullable().optional(),
  notes: z.string().nullable().optional(),
});
