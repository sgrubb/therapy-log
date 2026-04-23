import { z } from "zod";

export const migrationInfoSchema = z.object({
  currentVersion: z.number(),
  requiredVersion: z.number(),
  createdByApp: z.boolean(),
});
