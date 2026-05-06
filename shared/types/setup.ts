import { z } from "zod";
import { setupSaveConfigSchema, validateDatabaseResultSchema, setupCreateFirstTherapistSchema } from "@shared/schemas/setup";

export type SetupSaveConfigParams = z.infer<typeof setupSaveConfigSchema>;
export type ValidateDatabaseResult = z.infer<typeof validateDatabaseResultSchema>;
export type SetupCreateFirstTherapistParams = z.infer<typeof setupCreateFirstTherapistSchema>;
