import { z } from "zod";
import {
  therapistSchema,
  clientSchema,
  clientWithTherapistSchema,
  sessionSchema,
  sessionWithRelationsSchema,
} from "@/schemas/ipc";
import type {
  SessionDay,
  Outcome,
  SessionStatus,
  SessionType,
  DeliveryMethod,
  MissedReason,
} from "@/types/enums";

// ── Domain model types (inferred from Zod schemas after transform) ──────────

export type Therapist = z.infer<typeof therapistSchema>;
export type Client = z.infer<typeof clientSchema>;
export type ClientWithTherapist = z.infer<typeof clientWithTherapistSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type SessionWithRelations = z.infer<typeof sessionWithRelationsSchema>;

// ── IPC input types (data SENT to IPC — structured clone preserves Date) ────

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

export interface CreateClient {
  hospital_number: string;
  first_name: string;
  last_name: string;
  dob: Date;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  session_day?: SessionDay | null;
  session_time?: string | null;
  session_duration?: number | null;
  session_delivery_method?: DeliveryMethod | null;
  therapist_id: number;
  is_closed?: boolean;
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
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  session_day?: SessionDay | null;
  session_time?: string | null;
  session_duration?: number | null;
  session_delivery_method?: DeliveryMethod | null;
  therapist_id?: number;
  is_closed?: boolean;
  pre_score?: number | null;
  post_score?: number | null;
  outcome?: Outcome | null;
  notes?: string | null;
}

export interface CloseClient {
  post_score?: number | null;
  outcome: Outcome;
  notes?: string | null;
}

export interface ReopenClient {
  notes?: string | null;
}

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

// ── ElectronAPI interface (for window.electronAPI typing in the renderer) ───
// Intentionally loose — all type safety is provided by src/lib/ipc.ts via Zod.

export interface ElectronAPI {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}
