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
  status: z.enum(Object.values(SessionStatus) as [SessionStatus, ...SessionStatus[]]).nullable(),
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

// Cross-field rules tying status, occurred_at, and missed_reason together.
// Callers (forms, CSV import) always send these as a coherent set; partial
// updates that omit `status` skip the checks.
function validateSessionStatusFields(
  data: {
    status?: SessionStatus | null;
    occurred_at?: Date | null;
    missed_reason?: MissedReason | null;
  },
  ctx: z.RefinementCtx,
): void {
  if (data.status === undefined) {
    return;
  }
  if (data.status === null) {
    if (data.occurred_at != null) {
      ctx.addIssue({
        code: "custom",
        message: "occurred_at must not be set when session is unconfirmed.",
        path: ["occurred_at"],
      });
    }
    if (data.missed_reason != null) {
      ctx.addIssue({
        code: "custom",
        message: "missed_reason must not be set when session is unconfirmed.",
        path: ["missed_reason"],
      });
    }
    return;
  }
  if (data.occurred_at == null) {
    ctx.addIssue({
      code: "custom",
      message: "occurred_at is required when status is set.",
      path: ["occurred_at"],
    });
  }
  if (data.status === SessionStatus.Attended && data.missed_reason != null) {
    ctx.addIssue({
      code: "custom",
      message: "missed_reason must not be set when status is Attended.",
      path: ["missed_reason"],
    });
  }
  if (
    (data.status === SessionStatus.DNA || data.status === SessionStatus.Cancelled)
    && data.missed_reason == null
  ) {
    ctx.addIssue({
      code: "custom",
      message: "missed_reason is required when status is DNA or Cancelled.",
      path: ["missed_reason"],
    });
  }
}

export const sessionCreateSchema = z.object({
  client_id: z.number().int().positive(),
  therapist_id: z.number().int().positive(),
  scheduled_at: z.coerce.date(),
  occurred_at: z.coerce.date().nullable().optional(),
  duration: z.number().int().positive(),
  status: z.enum(Object.values(SessionStatus) as [SessionStatus, ...SessionStatus[]]).nullable().optional(),
  session_type: z.enum(Object.values(SessionType) as [SessionType, ...SessionType[]]),
  delivery_method: z.enum(Object.values(DeliveryMethod) as [DeliveryMethod, ...DeliveryMethod[]]),
  missed_reason: z.enum(Object.values(MissedReason) as [MissedReason, ...MissedReason[]]).nullable().optional(),
  notes: z.string().nullable().optional(),
}).superRefine(validateSessionStatusFields);

export const sessionUpdateSchema = z.object({
  updated_at: z.coerce.date(),
  client_id: z.number().int().positive().optional(),
  therapist_id: z.number().int().positive().optional(),
  scheduled_at: z.coerce.date().optional(),
  occurred_at: z.coerce.date().nullable().optional(),
  duration: z.number().int().positive().optional(),
  status: z.enum(Object.values(SessionStatus) as [SessionStatus, ...SessionStatus[]]).nullable().optional(),
  session_type: z.enum(Object.values(SessionType) as [SessionType, ...SessionType[]]).optional(),
  delivery_method: z.enum(Object.values(DeliveryMethod) as [DeliveryMethod, ...DeliveryMethod[]]).optional(),
  missed_reason: z.enum(Object.values(MissedReason) as [MissedReason, ...MissedReason[]]).nullable().optional(),
  notes: z.string().nullable().optional(),
}).superRefine(validateSessionStatusFields);

export const sessionConfirmSchema = z.object({
  updated_at: z.coerce.date(),
  status: z.enum(Object.values(SessionStatus) as [SessionStatus, ...SessionStatus[]]),
  occurred_at: z.coerce.date(),
  missed_reason: z.enum(Object.values(MissedReason) as [MissedReason, ...MissedReason[]]).nullable().optional(),
  notes: z.string().nullable().optional(),
}).superRefine(validateSessionStatusFields);

export const sessionFiltersSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  therapistIds: z.array(z.number().int().positive()).optional(),
  clientId: z.number().int().positive().optional(),
  status: z.enum(Object.values(SessionStatus) as [SessionStatus, ...SessionStatus[]]).nullable().optional(),
});

export const sessionListParamsSchema = sessionFiltersSchema.extend({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(200),
  sortKey: z.string(),
  sortDir: z.enum([SortDir.Asc, SortDir.Desc] as const),
});

export const sessionListRangeParamsSchema = sessionFiltersSchema.extend({
  sortKey: z.string(),
  sortDir: z.enum([SortDir.Asc, SortDir.Desc] as const),
});

export const sessionListExpectedParamsSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  therapistIds: z.array(z.number().int().positive()).optional(),
  clientId: z.number().int().positive().optional(),
  sortKey: z.string(),
  sortDir: z.enum([SortDir.Asc, SortDir.Desc] as const),
});
