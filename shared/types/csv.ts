import { z } from "zod";
import {
  therapistExportParamsSchema,
  clientExportParamsSchema,
  sessionExportParamsSchema,
} from "@shared/schemas/csv";

export interface ImportResult {
  inserted: number;
  errors: Array<{ row: number; message: string }>;
}

export type TherapistExportParams = z.infer<typeof therapistExportParamsSchema>;
export type ClientExportParams = z.infer<typeof clientExportParamsSchema>;
export type SessionExportParams = z.infer<typeof sessionExportParamsSchema>;

export const THERAPIST_CSV_HEADERS = [
  "first_name", "last_name", "start_date", "is_admin",
] as const;

export const THERAPIST_REQUIRED_HEADERS = ["first_name", "last_name", "start_date"] as const;

export const CLIENT_CSV_HEADERS = [
  "hospital_number", "first_name", "last_name", "dob", "start_date",
  "therapist_first_name", "therapist_last_name",
  "address", "phone", "email",
  "session_day", "session_time", "session_duration_minutes", "session_delivery_method",
  "closed_date", "pre_score", "post_score", "outcome", "notes",
] as const;

export const CLIENT_REQUIRED_HEADERS = [
  "hospital_number", "first_name", "last_name", "dob", "start_date",
  "therapist_first_name", "therapist_last_name",
] as const;

export const SESSION_CSV_HEADERS = [
  "client_first_name", "client_last_name",
  "therapist_first_name", "therapist_last_name",
  "scheduled_at", "duration_minutes",
  "status", "session_type", "delivery_method",
  "occurred_at", "missed_reason", "notes",
] as const;

export const SESSION_REQUIRED_HEADERS = [
  "client_first_name", "client_last_name",
  "therapist_first_name", "therapist_last_name",
  "scheduled_at", "duration_minutes",
  "status", "session_type", "delivery_method",
] as const;
