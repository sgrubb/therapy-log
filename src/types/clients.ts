import { z } from "zod";
import { clientSchema, clientWithTherapistSchema } from "@/schemas/clients";
import type {
  SessionDay,
  Outcome,
  DeliveryMethod,
} from "@/types/enums";

export type Client = z.infer<typeof clientSchema>;
export type ClientWithTherapist = z.infer<typeof clientWithTherapistSchema>;

export interface CreateClient {
  hospital_number: string;
  first_name: string;
  last_name: string;
  dob: Date;
  start_date: Date;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  session_day?: SessionDay | null;
  session_time?: string | null;
  session_duration?: number | null;
  session_delivery_method?: DeliveryMethod | null;
  therapist_id: number;
  closed_date?: Date | null;
  pre_score?: number | null;
  post_score?: number | null;
  outcome?: Outcome | null;
  notes?: string | null;
}

export interface UpdateClient {
  updated_at: Date;
  hospital_number?: string;
  first_name?: string;
  last_name?: string;
  dob?: Date;
  start_date?: Date;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  session_day?: SessionDay | null;
  session_time?: string | null;
  session_duration?: number | null;
  session_delivery_method?: DeliveryMethod | null;
  therapist_id?: number;
  closed_date?: Date | null;
  pre_score?: number | null;
  post_score?: number | null;
  outcome?: Outcome | null;
  notes?: string | null;
}

export interface CloseClient {
  post_score?: number | null;
  outcome: Outcome;
  closed_date: Date;
  notes?: string | null;
}

export interface ReopenClient {
  notes?: string | null;
}
