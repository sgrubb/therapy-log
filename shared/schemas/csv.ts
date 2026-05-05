import { z } from "zod";
import { TherapistStatus, ClientStatus } from "@shared/types/enums";
import { sessionFiltersSchema } from "@shared/schemas/sessions";
import { therapistId } from "@shared/types/brands";

export const importResultSchema = z.object({
  inserted: z.number(),
  errors: z.array(z.object({ row: z.number(), message: z.string() })),
});

export const csvExportResultSchema = z.object({ path: z.string() });

export const therapistExportParamsSchema = z.object({
  status: z.enum(Object.values(TherapistStatus) as [TherapistStatus, ...TherapistStatus[]]),
});

export const clientExportParamsSchema = z.object({
  status: z.enum(Object.values(ClientStatus) as [ClientStatus, ...ClientStatus[]]).optional(),
  therapistId: z.number().int().transform(therapistId).nullable().optional(),
  search: z.string().optional(),
});

export { sessionFiltersSchema as sessionExportParamsSchema };
