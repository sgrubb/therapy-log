import { z } from "zod";
import { SortDir } from "@shared/types/enums";
import {
  SessionStatus,
  SessionType,
  DeliveryMethod,
  MissedReason,
} from "../../generated/prisma/client";

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

export const sessionExpectedParamsSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  therapistIds: z.array(z.number().int().positive()).optional(),
  clientId: z.number().int().positive().optional(),
  sortKey: z.string(),
  sortDir: z.enum([SortDir.Asc, SortDir.Desc] as const),
});
