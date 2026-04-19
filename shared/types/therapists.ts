import { z } from "zod";
import {
  therapistSchema,
  therapistCreateSchema,
  therapistUpdateSchema,
  therapistDeactivateSchema,
  therapistReactivateSchema,
  therapistListParamsSchema,
  therapistListAllParamsSchema,
} from "@shared/schemas/therapists";

export type Therapist = z.infer<typeof therapistSchema>;
export type CreateTherapist = z.infer<typeof therapistCreateSchema>;
export type UpdateTherapist = z.infer<typeof therapistUpdateSchema>;
export type DeactivateTherapist = z.infer<typeof therapistDeactivateSchema>;
export type ReactivateTherapist = z.infer<typeof therapistReactivateSchema>;
export type TherapistListParams = z.infer<typeof therapistListParamsSchema>;
export type TherapistListAllParams = z.infer<typeof therapistListAllParamsSchema>;
