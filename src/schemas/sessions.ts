import { z } from "zod";
import { clientBaseSchema } from "@/schemas/clients";
import { therapistSchema } from "@/schemas/therapists";

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

export const sessionSchema = sessionBaseSchema;

export const sessionWithRelationsSchema = sessionBaseSchema.extend({
  client: clientBaseSchema,
  therapist: therapistSchema,
});

const personSchema = z.object({ id: z.number(), first_name: z.string(), last_name: z.string() });

export const expectedSessionSchema = z.object({
  id: z.string(),
  client_id: z.number(),
  therapist_id: z.number(),
  scheduled_at: z.date(),
  duration: z.number(),
  client: personSchema,
  therapist: personSchema,
});
