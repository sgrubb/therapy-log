import { z } from "zod";
import {
  therapistSchema,
  therapistCreateSchema,
  therapistUpdateSchema,
  therapistListParamsSchema,
} from "@shared/schemas/therapists";

export type Therapist = z.infer<typeof therapistSchema>;
export type CreateTherapist = z.infer<typeof therapistCreateSchema>;
export type UpdateTherapist = z.infer<typeof therapistUpdateSchema>;
export type TherapistListParams = z.infer<typeof therapistListParamsSchema>;
