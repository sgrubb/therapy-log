import { z } from "zod";

// ── Internal base schemas (no transform — used for .extend() composition) ──

const therapistBaseSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  is_admin: z.boolean(),
});

const clientBaseSchema = z.object({
  id: z.number(),
  hospital_number: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  dob: z.date(),
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
  therapist_id: z.number(),
  is_closed: z.boolean(),
  pre_score: z.number().nullable(),
  post_score: z.number().nullable(),
  outcome: z
    .enum(["Improved", "NoChange", "Declined", "DataUnavailable"])
    .nullable(),
  notes: z.string().nullable(),
});

const sessionBaseSchema = z.object({
  id: z.number(),
  client_id: z.number(),
  therapist_id: z.number(),
  scheduled_at: z.date(),
  occurred_at: z.date().nullable(),
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
