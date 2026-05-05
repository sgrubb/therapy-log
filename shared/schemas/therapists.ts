import { z } from "zod";
import { SortDir, TherapistStatus } from "@shared/types/enums";
import { therapistId, clientId } from "@shared/types/brands";

// ── Response schemas ────────────────────────────────────────────────────────

export const therapistSchema = z.object({
  id: z.number().transform(therapistId),
  first_name: z.string(),
  last_name: z.string(),
  is_admin: z.boolean(),
  start_date: z.date(),
  deactivated_date: z.date().nullable(),
  updated_at: z.date(),
});

// ── Request schemas ─────────────────────────────────────────────────────────

export const therapistCreateSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  is_admin: z.boolean().optional(),
  start_date: z.coerce.date(),
});

export const therapistUpdateSchema = z.object({
  updated_at: z.coerce.date(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  is_admin: z.boolean().optional(),
  start_date: z.coerce.date().optional(),
});

export const therapistDeactivateSchema = z.object({
  updated_at: z.coerce.date(),
  client_reassignments: z.array(z.object({
    client_id: z.number().int().positive().transform(clientId),
    new_therapist_id: z.number().int().positive().transform(therapistId),
  })),
});

export const therapistReactivateSchema = z.object({
  updated_at: z.coerce.date(),
});

export const therapistListParamsSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(200),
  sortKey: z.string(),
  sortDir: z.enum([SortDir.Asc, SortDir.Desc] as const),
  status: z.enum(Object.values(TherapistStatus) as [TherapistStatus, ...TherapistStatus[]]),
});

export const therapistListAllParamsSchema = z.object({
  activeOnly: z.boolean().optional(),
});
