import { z } from "zod";
import { therapistSchema } from "@/schemas/therapists";

export const clientBaseSchema = z.object({
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

export const clientSchema = clientBaseSchema;

export const clientWithTherapistSchema = clientBaseSchema.extend({
  therapist: therapistSchema,
});
