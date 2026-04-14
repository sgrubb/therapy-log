import { z } from "zod";

const therapistBaseSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  is_admin: z.boolean(),
  updated_at: z.date(),
});

export const therapistSchema = therapistBaseSchema;
