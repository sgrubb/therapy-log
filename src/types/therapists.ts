import { z } from "zod";
import { therapistSchema } from "@/schemas/therapists";

export type Therapist = z.infer<typeof therapistSchema>;

export interface CreateTherapist {
  first_name: string;
  last_name: string;
  is_admin?: boolean;
}

export interface UpdateTherapist {
  updated_at: Date;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
}
