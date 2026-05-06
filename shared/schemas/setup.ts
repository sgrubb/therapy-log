import { z } from "zod";

export const setupSaveConfigSchema = z.object({
  dbPath: z.string(),
  createdByApp: z.boolean(),
});

export const validateDatabaseResultSchema = z.object({
  valid: z.boolean(),
  version: z.number(),
});

export const setupCreateFirstTherapistSchema = z.object({
  dbPath: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  startDate: z.coerce.date(),
});
