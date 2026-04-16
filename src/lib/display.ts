import type { SessionDay, Outcome, SessionType, DeliveryMethod, MissedReason } from "@shared/types/enums";

export const SESSION_DAY_INDEX: Record<SessionDay, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export const OUTCOME_NAMES: Record<Outcome, string> = {
  Improved: "Improved",
  NoChange: "No Change",
  Declined: "Declined",
  DataUnavailable: "Data Unavailable",
};

export const SESSION_TYPE_NAMES: Record<SessionType, string> = {
  AssessmentChild: "Assessment (Child)",
  AssessmentParentFamily: "Assessment (Parent/Family)",
  Child: "Child",
  Parent: "Parent",
  Family: "Family",
  CheckIn: "Check-In",
  ProfessionalsMeeting: "Professionals Meeting",
  Other: "Other",
};

export const DELIVERY_METHOD_NAMES: Record<DeliveryMethod, string> = {
  FaceToFace: "Face to Face",
  Online: "Online",
  Telephone: "Telephone",
  Email: "Email",
};

export const MISSED_REASON_NAMES: Record<MissedReason, string> = {
  Illness: "Illness",
  Holiday: "Holiday",
  ExamPeriod: "Exam Period",
  AnnualLeave: "Annual Leave",
  SchoolTransition: "School Transition",
  NoShow: "No Show",
  Other: "Other",
};
