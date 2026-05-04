import { parse as csvParse } from "csv-parse/sync";
import { stringify as csvStringify } from "csv-stringify/sync";
import { format } from "date-fns";
import type { Therapist, Client, Session } from "../../../generated/prisma/client";
import { therapistRowSchema, clientRowSchema, sessionRowSchema } from "../schemas/csv";
import { therapistCreateSchema } from "@shared/schemas/therapists";
import { clientCreateSchema } from "@shared/schemas/clients";
import { sessionCreateSchema } from "@shared/schemas/sessions";
import type { TherapistPayload, ClientPayload, SessionPayload } from "../types/csv";
import type { z } from "zod";

// ── Parser / Serialiser ───────────────────────────────────────────────────────

export function parseCSV(content: string): Array<Record<string, string>> {
  return csvParse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
    relax_column_count: true,
  });
}

export function generateCSV(
  headers: readonly string[],
  rows: string[][],
): string {
  return csvStringify(rows, { header: true, columns: [...headers] });
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatDate(d: Date | null | undefined): string {
  if (!d) {
    return "";
  }
  return format(d, "yyyy-MM-dd");
}

function formatTime(d: Date | null | undefined): string {
  if (!d) {
    return "";
  }
  return format(d, "HH:mm");
}


// ── Types ─────────────────────────────────────────────────────────────────────

type RowError = { row: number; message: string };
type RowResult<T> = { payload: T } | { errors: RowError[] };

// Re-runs the IPC create schema against a constructed payload so cross-field
// rules (defined once on the IPC schema) are enforced for CSV imports too.
function checkAgainstIpcSchema<T>(
  schema: z.ZodType,
  payload: T,
  rowNum: number,
): RowResult<T> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    return { errors: result.error.issues.map((issue) => ({ row: rowNum, message: issue.message })) };
  }
  return { payload };
}

// ── CSV → model mappers ───────────────────────────────────────────────────────

export function mapCSVRowToTherapist(
  row: Record<string, string>,
  rowNum: number,
): RowResult<TherapistPayload> {
  const result = therapistRowSchema.safeParse(row);
  if (!result.success) {
    return { errors: result.error.issues.map((issue) => ({ row: rowNum, message: issue.message })) };
  }
  return checkAgainstIpcSchema(therapistCreateSchema, result.data, rowNum);
}

export function mapCSVRowToClient(
  row: Record<string, string>,
  rowNum: number,
  therapistMap: Map<string, number>,
): RowResult<ClientPayload> {
  const result = clientRowSchema.safeParse(row);
  if (!result.success) {
    return { errors: result.error.issues.map((issue) => ({ row: rowNum, message: issue.message })) };
  }

  const key = `${result.data.therapist_first_name} ${result.data.therapist_last_name}`;
  const therapist_id = therapistMap.get(key);
  if (therapist_id === undefined) {
    return { errors: [{ row: rowNum, message: `therapist "${key}" not found` }] };
  }

  const { therapist_first_name: _tfn, therapist_last_name: _tln, ...rest } = result.data;
  const payload: ClientPayload = { ...rest, therapist_id };
  return checkAgainstIpcSchema(clientCreateSchema, payload, rowNum);
}

export function mapCSVRowToSession(
  row: Record<string, string>,
  rowNum: number,
  clientMap: Map<string, number>,
  therapistMap: Map<string, number>,
): RowResult<SessionPayload> {
  const result = sessionRowSchema.safeParse(row);
  if (!result.success) {
    return { errors: result.error.issues.map((issue) => ({ row: rowNum, message: issue.message })) };
  }

  const clientKey = `${result.data.client_first_name} ${result.data.client_last_name}`;
  const therapistKey = `${result.data.therapist_first_name} ${result.data.therapist_last_name}`;
  const client_id = clientMap.get(clientKey);
  const therapist_id = therapistMap.get(therapistKey);

  const errors: RowError[] = [
    ...(client_id === undefined ? [{ row: rowNum, message: `client "${clientKey}" not found` }] : []),
    ...(therapist_id === undefined ? [{ row: rowNum, message: `therapist "${therapistKey}" not found` }] : []),
  ];

  if (errors.length > 0) {
    return { errors };
  }

  const scheduled_at = new Date(`${result.data.scheduled_date}T${result.data.scheduled_time}`);
  if (isNaN(scheduled_at.getTime())) {
    return {
      errors: [{ row: rowNum, message: '"scheduled_date" and "scheduled_time" do not form a valid datetime' }],
    };
  }

  const occurredDate = result.data.occurred_date;
  const occurredTime = result.data.occurred_time;
  if ((occurredDate === null) !== (occurredTime === null)) {
    return {
      errors: [{ row: rowNum, message: '"occurred_date" and "occurred_time" must both be set or both be empty' }],
    };
  }
  const occurred_at = occurredDate !== null && occurredTime !== null
    ? new Date(`${occurredDate}T${occurredTime}`)
    : null;
  if (occurred_at !== null && isNaN(occurred_at.getTime())) {
    return {
      errors: [{ row: rowNum, message: '"occurred_date" and "occurred_time" do not form a valid datetime' }],
    };
  }

  const {
    client_first_name: _cfn,
    client_last_name: _cln,
    therapist_first_name: _tfn,
    therapist_last_name: _tln,
    scheduled_date: _sd,
    scheduled_time: _st,
    occurred_date: _od,
    occurred_time: _ot,
    ...rest
  } = result.data;
  const payload: SessionPayload = {
    ...rest,
    client_id: client_id!,
    therapist_id: therapist_id!,
    scheduled_at,
    occurred_at,
  };
  return checkAgainstIpcSchema(sessionCreateSchema, payload, rowNum);
}

// ── Model → CSV mappers ───────────────────────────────────────────────────────

export function mapTherapistToCSVRow(t: Therapist): string[] {
  return [t.first_name, t.last_name, formatDate(t.start_date), String(t.is_admin)];
}

export function mapClientToCSVRow(c: Client & { therapist: Therapist }): string[] {
  return [
    c.hospital_number,
    c.first_name,
    c.last_name,
    formatDate(c.dob),
    formatDate(c.start_date),
    c.therapist.first_name,
    c.therapist.last_name,
    c.address ?? "",
    c.phone ?? "",
    c.email ?? "",
    c.session_day ?? "",
    c.session_time ?? "",
    c.session_duration !== null ? String(c.session_duration) : "",
    c.session_delivery_method ?? "",
    formatDate(c.closed_date),
    c.pre_score !== null ? String(c.pre_score) : "",
    c.post_score !== null ? String(c.post_score) : "",
    c.outcome ?? "",
    c.notes ?? "",
  ];
}

export function mapSessionToCSVRow(s: Session & { client: Client; therapist: Therapist }): string[] {
  return [
    s.client.first_name,
    s.client.last_name,
    s.therapist.first_name,
    s.therapist.last_name,
    formatDate(s.scheduled_at),
    formatTime(s.scheduled_at),
    String(s.duration),
    s.session_type,
    s.delivery_method,
    s.status ?? "",
    formatDate(s.occurred_at),
    formatTime(s.occurred_at),
    s.missed_reason ?? "",
    s.notes ?? "",
  ];
}
