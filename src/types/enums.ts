// ── Enums ──────────────────────────────────────────────────────────────────
// Defined as const objects so Object.values() works at runtime, plus a type
// alias so they can be used as type annotations.
// Used by renderer only — electron code uses Prisma-generated enums directly.

export const SessionDay = {
  Monday: "Monday",
  Tuesday: "Tuesday",
  Wednesday: "Wednesday",
  Thursday: "Thursday",
  Friday: "Friday",
  Saturday: "Saturday",
  Sunday: "Sunday",
} as const;
export type SessionDay = (typeof SessionDay)[keyof typeof SessionDay];

export const Outcome = {
  Improved: "Improved",
  NoChange: "NoChange",
  Declined: "Declined",
  DataUnavailable: "DataUnavailable",
} as const;
export type Outcome = (typeof Outcome)[keyof typeof Outcome];

export const SessionStatus = {
  Scheduled: "Scheduled",
  Attended: "Attended",
  DNA: "DNA",
  Cancelled: "Cancelled",
  Rescheduled: "Rescheduled",
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const SessionType = {
  AssessmentChild: "AssessmentChild",
  AssessmentParentFamily: "AssessmentParentFamily",
  Child: "Child",
  Parent: "Parent",
  Family: "Family",
  CheckIn: "CheckIn",
  ProfessionalsMeeting: "ProfessionalsMeeting",
  Other: "Other",
} as const;
export type SessionType = (typeof SessionType)[keyof typeof SessionType];

export const DeliveryMethod = {
  FaceToFace: "FaceToFace",
  Online: "Online",
  Telephone: "Telephone",
  Email: "Email",
} as const;
export type DeliveryMethod = (typeof DeliveryMethod)[keyof typeof DeliveryMethod];

export const MissedReason = {
  Illness: "Illness",
  Holiday: "Holiday",
  ExamPeriod: "ExamPeriod",
  AnnualLeave: "AnnualLeave",
  SchoolTransition: "SchoolTransition",
  NoShow: "NoShow",
  Other: "Other",
} as const;
export type MissedReason = (typeof MissedReason)[keyof typeof MissedReason];
