import { z } from "zod";
import {
  sessionSchema,
  sessionWithClientAndTherapistSchema,
  expectedSessionSchema,
  sessionCreateSchema,
  sessionUpdateSchema,
  sessionFiltersSchema,
  sessionListParamsSchema,
  sessionListRangeParamsSchema,
  sessionListExpectedParamsSchema,
} from "@shared/schemas/sessions";

export type Session = z.infer<typeof sessionSchema>;
export type SessionWithClientAndTherapist = z.infer<typeof sessionWithClientAndTherapistSchema>;
export type ExpectedSession = z.infer<typeof expectedSessionSchema>;

export type CreateSession = z.infer<typeof sessionCreateSchema>;
export type UpdateSession = z.infer<typeof sessionUpdateSchema>;

export type SessionFilters = z.infer<typeof sessionFiltersSchema>;
export type SessionListParams = z.infer<typeof sessionListParamsSchema>;
export type SessionListRangeParams = z.infer<typeof sessionListRangeParamsSchema>;
export type SessionListExpectedParams = z.infer<typeof sessionListExpectedParamsSchema>;
