import { z } from "zod";
import { SessionDay, Outcome } from "@/types/enums";

const sessionDayValues = Object.values(SessionDay) as [
  SessionDay,
  ...SessionDay[],
];
const outcomeValues = Object.values(Outcome) as [Outcome, ...Outcome[]];

export const clientFormSchema = z
  .object({
    first_name: z.string().min(1, "First name is required."),
    last_name: z.string().min(1, "Last name is required."),
    hospital_number: z.string().min(1, "Hospital number is required."),
    dob: z.string().min(1, "Date of birth is required."),
    address: z.string().optional().or(z.literal("")),
    email: z
      .email("Please enter a valid email address.")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .regex(/^\+?[\d\s]+$/, "Please enter a valid phone number.")
      .optional()
      .or(z.literal("")),
    session_day: z.enum(sessionDayValues).optional().or(z.literal("")),
    session_time: z.string().optional().or(z.literal("")),
    therapist_id: z.string().min(1, "Therapist is required."),
    pre_score: z.string().optional().or(z.literal("")),
    post_score: z.string().optional().or(z.literal("")),
    outcome: z.enum(outcomeValues).optional().or(z.literal("")),
    notes: z
      .string()
      .max(1000, "Notes must be 1000 characters or fewer.")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const phone = data.phone ?? "";
    const email = data.email ?? "";
    if (!phone.trim() && !email.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of phone or email is required.",
        path: ["email"],
      });
    }
  });
