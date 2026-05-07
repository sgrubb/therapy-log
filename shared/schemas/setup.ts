import { z } from "zod";

export const setupSaveConfigSchema = z.object({
  dbPath: z.string(),
  createdByApp: z.boolean(),
  initialSelectedTherapistId: z.number().optional(),
});

export const validateDatabaseResultSchema = z.object({
  valid: z.boolean(),
  version: z.number(),
});

export const setupTherapistSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
});

export const setupCreateTherapistSchema = z.object({
  dbPath: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  startDate: z.coerce.date(),
  isAdmin: z.boolean(),
});
