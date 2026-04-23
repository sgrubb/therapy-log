import { z } from "zod";

export const setupSaveConfigSchema = z.object({
  dbPath: z.string(),
  createdByApp: z.boolean(),
});

export const validateDatabaseResultSchema = z.object({
  valid: z.boolean(),
  version: z.number(),
});
