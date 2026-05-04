import type { z } from "zod";
import type { therapistRowSchema, clientRowSchema, sessionRowSchema } from "../schemas/csv";

export type TherapistPayload = z.infer<typeof therapistRowSchema>;

export type ClientPayload =
  Omit<z.infer<typeof clientRowSchema>, "therapist_first_name" | "therapist_last_name"> & {
    therapist_id: number;
  };

export type SessionPayload =
  Omit<
    z.infer<typeof sessionRowSchema>,
    | "client_first_name"
    | "client_last_name"
    | "therapist_first_name"
    | "therapist_last_name"
    | "scheduled_date"
    | "scheduled_time"
    | "occurred_date"
    | "occurred_time"
  > & {
    client_id: number;
    therapist_id: number;
    scheduled_at: Date;
    occurred_at: Date | null;
  };
