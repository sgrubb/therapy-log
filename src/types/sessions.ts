import { z } from "zod";
import { sessionSchema, sessionWithRelationsSchema } from "@/schemas/sessions";
import type {
  SessionStatus,
  SessionType,
  DeliveryMethod,
  MissedReason,
} from "@/types/enums";

export type Session = z.infer<typeof sessionSchema>;
export type SessionWithRelations = z.infer<typeof sessionWithRelationsSchema>;

export interface CreateSession {
  client_id: number;
  therapist_id: number;
  scheduled_at: Date;
  occurred_at?: Date | null;
  duration: number;
  status: SessionStatus;
  session_type: SessionType;
  delivery_method: DeliveryMethod;
  missed_reason?: MissedReason | null;
  notes?: string | null;
}

export interface UpdateSession {
  updated_at: Date;
  client_id?: number;
  therapist_id?: number;
  scheduled_at?: Date;
  occurred_at?: Date | null;
  duration?: number;
  status?: SessionStatus;
  session_type?: SessionType;
  delivery_method?: DeliveryMethod;
  missed_reason?: MissedReason | null;
  notes?: string | null;
}
