import { z } from "zod";
import { SessionDay, Outcome, SessionType, DeliveryMethod, SessionStatus, MissedReason } from "@/types/enums";

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

const sessionTypeValues = Object.values(SessionType) as [SessionType, ...SessionType[]];
const deliveryMethodValues = Object.values(DeliveryMethod) as [DeliveryMethod, ...DeliveryMethod[]];
const sessionStatusValues = Object.values(SessionStatus) as [SessionStatus, ...SessionStatus[]];
const missedReasonValues = Object.values(MissedReason) as [MissedReason, ...MissedReason[]];

export const sessionFormSchema = z
  .object({
    client_id: z.string().min(1, "Client is required."),
    therapist_id: z.string().min(1, "Therapist is required."),
    date: z.string().min(1, "Date is required."),
    time: z.string().optional().or(z.literal("")),
    session_type: z.enum(sessionTypeValues, "Session type is required."),
    delivery_method: z.enum(deliveryMethodValues, "Delivery method is required."),
    status: z.enum(sessionStatusValues, "Status is required."),
    missed_reason: z.enum(missedReasonValues).optional().or(z.literal("")),
    notes: z
      .string()
      .max(1000, "Notes must be 1000 characters or fewer.")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.status && data.status !== SessionStatus.Attended && !data.missed_reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reason is required when session is not attended.",
        path: ["missed_reason"],
      });
    }
    if (data.date) {
      const d = new Date(data.date);
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      if (!isNaN(d.getTime()) && d > oneYearFromNow) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date cannot be more than 1 year in the future.",
          path: ["date"],
        });
      }
    }
  });
