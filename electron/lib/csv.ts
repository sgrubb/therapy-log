import { format } from "date-fns";
import {
  SessionDay,
  Outcome,
  SessionStatus,
  SessionType,
  DeliveryMethod,
  MissedReason,
} from "@shared/types/enums";

// ── Parser ───────────────────────────────────────────────────────────────────

function parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

export function parseCSV(content: string): Array<Record<string, string>> {
  const normalised = content
    .replace(/^﻿/, "") // strip BOM
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const lines = normalised.split("\n");
  const headerLine = lines[0];
  if (!headerLine?.trim()) {
    return [];
  }

  const headers = parseRow(headerLine).map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      continue;
    }
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return rows;
}

// ── Serialiser ───────────────────────────────────────────────────────────────

function escapeField(value: string | null | undefined): string {
  const str = value ?? "";
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(
  headers: readonly string[],
  rows: (string | null | undefined)[][],
): string {
  const lines = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeField).join(",")),
  ];
  return lines.join("\n");
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(d: Date | null | undefined): string {
  if (!d) {
    return "";
  }
  return format(d, "yyyy-MM-dd");
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) {
    return "";
  }
  return d.toISOString();
}

function parseDate(str: string): Date | null {
  if (!str) {
    return null;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// ── Validation helpers ───────────────────────────────────────────────────────

function req(
  row: Record<string, string>,
  key: string,
  errors: string[],
): string | null {
  const val = row[key];
  if (val === undefined || val === "") {
    errors.push(`"${key}" is required`);
    return null;
  }
  return val;
}

function opt(row: Record<string, string>, key: string): string | null {
  const val = row[key];
  return val !== undefined && val !== "" ? val : null;
}

function reqDate(
  row: Record<string, string>,
  key: string,
  errors: string[],
): Date | null {
  const val = req(row, key, errors);
  if (!val) {
    return null;
  }
  const d = parseDate(val);
  if (!d) {
    errors.push(`"${key}" is not a valid date (use YYYY-MM-DD)`);
    return null;
  }
  return d;
}

function optDate(
  row: Record<string, string>,
  key: string,
  errors: string[],
): Date | null {
  const val = opt(row, key);
  if (!val) {
    return null;
  }
  const d = parseDate(val);
  if (!d) {
    errors.push(`"${key}" is not a valid date (use YYYY-MM-DD or ISO datetime)`);
    return null;
  }
  return d;
}

function reqEnum<T extends string>(
  row: Record<string, string>,
  key: string,
  values: T[],
  errors: string[],
): T | null {
  const val = req(row, key, errors);
  if (!val) {
    return null;
  }
  if (!values.includes(val as T)) {
    errors.push(`"${key}" must be one of: ${values.join(", ")}`);
    return null;
  }
  return val as T;
}

function optEnum<T extends string>(
  row: Record<string, string>,
  key: string,
  values: T[],
  errors: string[],
): T | null {
  const val = opt(row, key);
  if (!val) {
    return null;
  }
  if (!values.includes(val as T)) {
    errors.push(`"${key}" must be one of: ${values.join(", ")}`);
    return null;
  }
  return val as T;
}

function reqPosInt(
  row: Record<string, string>,
  key: string,
  errors: string[],
): number | null {
  const val = req(row, key, errors);
  if (!val) {
    return null;
  }
  const n = parseInt(val, 10);
  if (isNaN(n) || n <= 0) {
    errors.push(`"${key}" must be a positive whole number`);
    return null;
  }
  return n;
}

function optFloat(row: Record<string, string>, key: string, errors: string[]): number | null {
  const val = opt(row, key);
  if (!val) {
    return null;
  }
  const n = parseFloat(val);
  if (isNaN(n)) {
    errors.push(`"${key}" must be a number`);
    return null;
  }
  return n;
}

// ── Therapist ────────────────────────────────────────────────────────────────

export interface TherapistPayload {
  first_name: string;
  last_name: string;
  start_date: Date;
  is_admin: boolean;
}

export function validateTherapistRow(
  row: Record<string, string>,
  rowNum: number,
): { payload: TherapistPayload } | { errors: Array<{ row: number; message: string }> } {
  const errors: string[] = [];

  const first_name = req(row, "first_name", errors);
  const last_name = req(row, "last_name", errors);
  const start_date = reqDate(row, "start_date", errors);

  const isAdminRaw = opt(row, "is_admin");
  const is_admin = isAdminRaw === "true" || isAdminRaw === "1";

  if (errors.length > 0) {
    return { errors: errors.map((message) => ({ row: rowNum, message })) };
  }

  return {
    payload: {
      first_name: first_name!,
      last_name: last_name!,
      start_date: start_date!,
      is_admin,
    },
  };
}

export function therapistToCSVRow(t: {
  first_name: string;
  last_name: string;
  start_date: Date;
  is_admin: boolean;
}): string[] {
  return [
    t.first_name,
    t.last_name,
    formatDate(t.start_date),
    String(t.is_admin),
  ];
}

// ── Client ───────────────────────────────────────────────────────────────────

export interface ClientPayload {
  hospital_number: string;
  first_name: string;
  last_name: string;
  dob: Date;
  start_date: Date;
  therapist_id: number;
  address: string | null;
  phone: string | null;
  email: string | null;
  session_day: SessionDay | null;
  session_time: string | null;
  session_duration: number | null;
  session_delivery_method: DeliveryMethod | null;
  closed_date: Date | null;
  pre_score: number | null;
  post_score: number | null;
  outcome: Outcome | null;
  notes: string | null;
}

export function validateClientRow(
  row: Record<string, string>,
  rowNum: number,
  therapistMap: Map<string, number>,
): { payload: ClientPayload } | { errors: Array<{ row: number; message: string }> } {
  const errors: string[] = [];

  const hospital_number = req(row, "hospital_number", errors);
  const first_name = req(row, "first_name", errors);
  const last_name = req(row, "last_name", errors);
  const dob = reqDate(row, "dob", errors);
  const start_date = reqDate(row, "start_date", errors);
  const therapist_first = req(row, "therapist_first_name", errors);
  const therapist_last = req(row, "therapist_last_name", errors);

  const address = opt(row, "address");
  const phone = opt(row, "phone");
  const email = opt(row, "email");
  const session_day = optEnum(row, "session_day", Object.values(SessionDay), errors);
  const session_time = opt(row, "session_time");
  const session_duration_raw = opt(row, "session_duration_minutes");
  const session_duration = session_duration_raw
    ? (() => {
        const n = parseInt(session_duration_raw, 10);
        if (isNaN(n) || n <= 0) {
          errors.push('"session_duration_minutes" must be a positive whole number');
          return null;
        }
        return n;
      })()
    : null;
  const session_delivery_method = optEnum(
    row, "session_delivery_method", Object.values(DeliveryMethod), errors,
  );
  const closed_date = optDate(row, "closed_date", errors);
  const pre_score = optFloat(row, "pre_score", errors);
  const post_score = optFloat(row, "post_score", errors);
  const outcome = optEnum(row, "outcome", Object.values(Outcome), errors);
  const notes = opt(row, "notes");

  let therapist_id: number | null = null;
  if (therapist_first && therapist_last) {
    const key = `${therapist_first} ${therapist_last}`;
    therapist_id = therapistMap.get(key) ?? null;
    if (therapist_id === null) {
      errors.push(`therapist "${key}" not found`);
    }
  }

  if (errors.length > 0) {
    return { errors: errors.map((message) => ({ row: rowNum, message })) };
  }

  return {
    payload: {
      hospital_number: hospital_number!,
      first_name: first_name!,
      last_name: last_name!,
      dob: dob!,
      start_date: start_date!,
      therapist_id: therapist_id!,
      address,
      phone,
      email,
      session_day,
      session_time,
      session_duration,
      session_delivery_method,
      closed_date,
      pre_score,
      post_score,
      outcome,
      notes,
    },
  };
}

export function clientToCSVRow(c: {
  hospital_number: string;
  first_name: string;
  last_name: string;
  dob: Date;
  start_date: Date;
  therapist: { first_name: string; last_name: string };
  address: string | null;
  phone: string | null;
  email: string | null;
  session_day: string | null;
  session_time: string | null;
  session_duration: number | null;
  session_delivery_method: string | null;
  closed_date: Date | null;
  pre_score: number | null;
  post_score: number | null;
  outcome: string | null;
  notes: string | null;
}): (string | null)[] {
  return [
    c.hospital_number,
    c.first_name,
    c.last_name,
    formatDate(c.dob),
    formatDate(c.start_date),
    c.therapist.first_name,
    c.therapist.last_name,
    c.address,
    c.phone,
    c.email,
    c.session_day,
    c.session_time,
    c.session_duration !== null ? String(c.session_duration) : null,
    c.session_delivery_method,
    formatDate(c.closed_date) || null,
    c.pre_score !== null ? String(c.pre_score) : null,
    c.post_score !== null ? String(c.post_score) : null,
    c.outcome,
    c.notes,
  ];
}

// ── Session ──────────────────────────────────────────────────────────────────

export interface SessionPayload {
  client_id: number;
  therapist_id: number;
  scheduled_at: Date;
  duration: number;
  status: SessionStatus;
  session_type: SessionType;
  delivery_method: DeliveryMethod;
  occurred_at: Date | null;
  missed_reason: MissedReason | null;
  notes: string | null;
}

export function validateSessionRow(
  row: Record<string, string>,
  rowNum: number,
  clientMap: Map<string, number>,
  therapistMap: Map<string, number>,
): { payload: SessionPayload } | { errors: Array<{ row: number; message: string }> } {
  const errors: string[] = [];

  const client_first = req(row, "client_first_name", errors);
  const client_last = req(row, "client_last_name", errors);
  const therapist_first = req(row, "therapist_first_name", errors);
  const therapist_last = req(row, "therapist_last_name", errors);
  const scheduled_at = reqDate(row, "scheduled_at", errors);
  const duration = reqPosInt(row, "duration_minutes", errors);
  const status = reqEnum(row, "status", Object.values(SessionStatus), errors);
  const session_type = reqEnum(row, "session_type", Object.values(SessionType), errors);
  const delivery_method = reqEnum(
    row, "delivery_method", Object.values(DeliveryMethod), errors,
  );
  const occurred_at = optDate(row, "occurred_at", errors);
  const missed_reason = optEnum(row, "missed_reason", Object.values(MissedReason), errors);
  const notes = opt(row, "notes");

  let client_id: number | null = null;
  if (client_first && client_last) {
    const key = `${client_first} ${client_last}`;
    client_id = clientMap.get(key) ?? null;
    if (client_id === null) {
      errors.push(`client "${key}" not found`);
    }
  }

  let therapist_id: number | null = null;
  if (therapist_first && therapist_last) {
    const key = `${therapist_first} ${therapist_last}`;
    therapist_id = therapistMap.get(key) ?? null;
    if (therapist_id === null) {
      errors.push(`therapist "${key}" not found`);
    }
  }

  if (errors.length > 0) {
    return { errors: errors.map((message) => ({ row: rowNum, message })) };
  }

  return {
    payload: {
      client_id: client_id!,
      therapist_id: therapist_id!,
      scheduled_at: scheduled_at!,
      duration: duration!,
      status: status!,
      session_type: session_type!,
      delivery_method: delivery_method!,
      occurred_at,
      missed_reason,
      notes,
    },
  };
}

export function sessionToCSVRow(s: {
  scheduled_at: Date;
  duration: number;
  status: string;
  session_type: string;
  delivery_method: string;
  occurred_at: Date | null;
  missed_reason: string | null;
  notes: string | null;
  client: { first_name: string; last_name: string };
  therapist: { first_name: string; last_name: string };
}): (string | null)[] {
  return [
    s.client.first_name,
    s.client.last_name,
    s.therapist.first_name,
    s.therapist.last_name,
    formatDateTime(s.scheduled_at),
    String(s.duration),
    s.status,
    s.session_type,
    s.delivery_method,
    formatDateTime(s.occurred_at) || null,
    s.missed_reason,
    s.notes,
  ];
}
