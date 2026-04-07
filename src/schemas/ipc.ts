import { z } from "zod";

// ── Internal base schemas (no transform — used for .extend() composition) ──

const therapistBaseSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  is_admin: z.boolean(),
  updated_at: z.date(),
});

const clientBaseSchema = z.object({
  id: z.number(),
  hospital_number: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  dob: z.date(),
  start_date: z.date(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  session_day: z
    .enum([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ])
    .nullable(),
  session_time: z.string().nullable(),
  session_duration: z.number().nullable(),
  session_delivery_method: z
    .enum(["FaceToFace", "Online", "Telephone", "Email"])
    .nullable(),
  therapist_id: z.number(),
  closed_date: z.date().nullable(),
  pre_score: z.number().nullable(),
  post_score: z.number().nullable(),
  outcome: z
    .enum(["Improved", "NoChange", "Declined", "DataUnavailable"])
    .nullable(),
  notes: z.string().nullable(),
  updated_at: z.date(),
});

const sessionBaseSchema = z.object({
  id: z.number(),
  client_id: z.number(),
  therapist_id: z.number(),
  scheduled_at: z.date(),
  occurred_at: z.date().nullable(),
  duration: z.number(),
  status: z.enum([
    "Scheduled",
    "Attended",
    "DNA",
    "Cancelled",
    "Rescheduled",
  ]),
  session_type: z.enum([
    "AssessmentChild",
    "AssessmentParentFamily",
    "Child",
    "Parent",
    "Family",
    "CheckIn",
    "ProfessionalsMeeting",
    "Other",
  ]),
  delivery_method: z.enum(["FaceToFace", "Online", "Telephone", "Email"]),
  missed_reason: z
    .enum([
      "Illness",
      "Holiday",
      "ExamPeriod",
      "AnnualLeave",
      "SchoolTransition",
      "NoShow",
      "Other",
    ])
    .nullable(),
  notes: z.string().nullable(),
  updated_at: z.date(),
});

// ── Exported schemas ───────────────────────────────────────────────────────

export const therapistSchema = therapistBaseSchema;

export const clientSchema = clientBaseSchema;

export const clientWithTherapistSchema = clientBaseSchema.extend({
  therapist: therapistBaseSchema,
});

export const sessionSchema = sessionBaseSchema;

export const sessionWithRelationsSchema = sessionBaseSchema.extend({
  client: clientBaseSchema,
  therapist: therapistBaseSchema,
});
