import { z } from "zod";
import {
  setupSaveConfigSchema,
  validateDatabaseResultSchema,
  setupTherapistSchema,
  setupCreateTherapistSchema,
} from "@shared/schemas/setup";

export type SetupSaveConfigParams = z.infer<typeof setupSaveConfigSchema>;
export type ValidateDatabaseResult = z.infer<typeof validateDatabaseResultSchema>;
export type SetupTherapist = z.infer<typeof setupTherapistSchema>;
export type SetupCreateTherapistParams = z.infer<typeof setupCreateTherapistSchema>;
