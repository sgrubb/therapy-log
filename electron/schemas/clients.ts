import { z } from "zod";
import { SortDir } from "@shared/types/enums";
import {
  SessionDay,
  Outcome,
  DeliveryMethod,
} from "../../generated/prisma/client";

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

export const clientListParamsSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(500),
  status: z.enum(["open", "closed", "all"]).optional().default("all"),
  therapistId: z.number().int().positive().nullable().optional(),
  search: z.string().optional(),
  sortKey: z.string(),
  sortDir: z.enum([SortDir.Asc, SortDir.Desc] as const),
});
