import { z } from "zod";
import { SortDir } from "@shared/types/enums";

// ── Response schemas ────────────────────────────────────────────────────────

export const therapistSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  is_admin: z.boolean(),
  updated_at: z.date(),
});

// ── Request schemas ─────────────────────────────────────────────────────────

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

export const therapistListParamsSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(200),
  sortKey: z.string(),
  sortDir: z.enum([SortDir.Asc, SortDir.Desc] as const),
});
