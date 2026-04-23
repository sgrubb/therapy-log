import { z } from "zod";
import { setupSaveConfigSchema, validateDatabaseResultSchema } from "@shared/schemas/setup";

export type SetupSaveConfigParams = z.infer<typeof setupSaveConfigSchema>;
export type ValidateDatabaseResult = z.infer<typeof validateDatabaseResultSchema>;
