import { z } from "zod";
import {
  SessionDay,
  Outcome,
  SessionStatus,
  SessionType,
  DeliveryMethod,
  MissedReason,
} from "@shared/types/enums";

// ── Field helpers ─────────────────────────────────────────────────────────────

const reqStr = (key: string) =>
  z.string().min(1, `"${key}" is required`);

// Optional helpers accept undefined so entirely absent CSV columns degrade gracefully to null.
const optStr = z.string().optional().transform((v) => v || null);

const reqDateField = (key: string) =>
  z.string()
    .min(1, `"${key}" is required`)
    .transform((v, ctx) => {
      const d = new Date(v);
      if (isNaN(d.getTime())) {
        ctx.addIssue({ code: "custom", message: `"${key}" is not a valid date (use YYYY-MM-DD)` });
        return z.NEVER;
      }
      return d;
    });

const optDateField = (key: string) =>
  z.string().optional().transform((v, ctx) => {
    if (!v) {
      return null;
    }
    const d = new Date(v);
    if (isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: `"${key}" is not a valid date (use YYYY-MM-DD)` });
      return z.NEVER;
    }
    return d;
  });

const reqEnumField = <T extends string>(key: string, values: readonly T[]) =>
  z.string()
    .min(1, `"${key}" is required`)
    .transform((v, ctx) => {
      if (!(values as readonly string[]).includes(v)) {
        ctx.addIssue({ code: "custom", message: `"${key}" must be one of: ${values.join(", ")}` });
        return z.NEVER;
      }
      return v as T;
    });

const optEnumField = <T extends string>(key: string, values: readonly T[]) =>
  z.string().optional().transform((v, ctx) => {
    if (!v) {
      return null;
    }
    if (!(values as readonly string[]).includes(v)) {
      ctx.addIssue({ code: "custom", message: `"${key}" must be one of: ${values.join(", ")}` });
      return z.NEVER;
    }
    return v as T;
  });

const reqPosIntField = (key: string) =>
  z.string()
    .min(1, `"${key}" is required`)
    .transform((v, ctx) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n <= 0) {
        ctx.addIssue({ code: "custom", message: `"${key}" must be a positive whole number` });
        return z.NEVER;
      }
      return n;
    });

const optPosIntField = (key: string) =>
  z.string().optional().transform((v, ctx) => {
    if (!v) {
      return null;
    }
    const n = parseInt(v, 10);
    if (isNaN(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: `"${key}" must be a positive whole number` });
      return z.NEVER;
    }
    return n;
  });

const optFloatField = (key: string) =>
  z.string().optional().transform((v, ctx) => {
    if (!v) {
      return null;
    }
    const n = parseFloat(v);
    if (isNaN(n)) {
      ctx.addIssue({ code: "custom", message: `"${key}" must be a number` });
      return z.NEVER;
    }
    return n;
  });

// ── Row schemas ───────────────────────────────────────────────────────────────

export const therapistRowSchema = z.object({
  first_name: reqStr("first_name"),
  last_name: reqStr("last_name"),
  start_date: reqDateField("start_date"),
  is_admin: z.string().optional().transform((v) => v === "true" || v === "1"),
});

export const clientRowSchema = z.object({
  hospital_number: reqStr("hospital_number"),
  first_name: reqStr("first_name"),
  last_name: reqStr("last_name"),
  dob: reqDateField("dob"),
  start_date: reqDateField("start_date"),
  therapist_first_name: reqStr("therapist_first_name"),
  therapist_last_name: reqStr("therapist_last_name"),
  address: optStr,
  phone: optStr,
  email: optStr,
  session_day: optEnumField("session_day", Object.values(SessionDay) as SessionDay[]),
  session_time: optStr,
  session_duration: optPosIntField("session_duration"),
  session_delivery_method: optEnumField(
    "session_delivery_method",
    Object.values(DeliveryMethod) as DeliveryMethod[],
  ),
  closed_date: optDateField("closed_date"),
  pre_score: optFloatField("pre_score"),
  post_score: optFloatField("post_score"),
  outcome: optEnumField("outcome", Object.values(Outcome) as Outcome[]),
  notes: optStr,
});

export const sessionRowSchema = z.object({
  client_first_name: reqStr("client_first_name"),
  client_last_name: reqStr("client_last_name"),
  therapist_first_name: reqStr("therapist_first_name"),
  therapist_last_name: reqStr("therapist_last_name"),
  scheduled_date: reqStr("scheduled_date"),
  scheduled_time: reqStr("scheduled_time"),
  duration: reqPosIntField("duration"),
  session_type: reqEnumField("session_type", Object.values(SessionType) as SessionType[]),
  delivery_method: reqEnumField("delivery_method", Object.values(DeliveryMethod) as DeliveryMethod[]),
  status: optEnumField("status", Object.values(SessionStatus) as SessionStatus[]),
  occurred_date: optStr,
  occurred_time: optStr,
  missed_reason: optEnumField("missed_reason", Object.values(MissedReason) as MissedReason[]),
  notes: optStr,
});
