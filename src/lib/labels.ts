import type { Outcome, SessionType, DeliveryMethod, MissedReason } from "@shared/types/enums";
import type {
  THERAPIST_CSV_HEADERS,
  CLIENT_CSV_HEADERS,
  SESSION_CSV_HEADERS,
} from "@shared/types/csv";

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

export const THERAPIST_CSV_DESCRIPTIONS: Record<typeof THERAPIST_CSV_HEADERS[number], string> = {
  first_name: "First name",
  last_name: "Last name",
  start_date: "Start date (YYYY-MM-DD)",
  is_admin: "true or false (default: false)",
};

export const CLIENT_CSV_DESCRIPTIONS: Record<typeof CLIENT_CSV_HEADERS[number], string> = {
  hospital_number: "Unique hospital / NHS number",
  first_name: "First name",
  last_name: "Last name",
  dob: "Date of birth (YYYY-MM-DD)",
  start_date: "Date the client started (YYYY-MM-DD)",
  therapist_first_name: "Assigned therapist first name",
  therapist_last_name: "Assigned therapist last name",
  address: "Home address",
  phone: "Phone number",
  email: "Email address",
  session_day: "Monday / Tuesday / Wednesday / Thursday / Friday / Saturday / Sunday",
  session_time: "Scheduled time (HH:MM)",
  session_duration: "Session duration in minutes",
  session_delivery_method: "InPerson / Video / Phone",
  closed_date: "Date the client was closed (YYYY-MM-DD)",
  pre_score: "Pre-intervention score (number)",
  post_score: "Post-intervention score (number)",
  outcome: "Improved / NoChange / Deteriorated / Incomplete",
  notes: "Free-text notes",
};

export const SESSION_CSV_DESCRIPTIONS: Record<typeof SESSION_CSV_HEADERS[number], string> = {
  client_first_name: "Client first name",
  client_last_name: "Client last name",
  therapist_first_name: "Therapist first name",
  therapist_last_name: "Therapist last name",
  scheduled_date: "Scheduled date (YYYY-MM-DD)",
  scheduled_time: "Scheduled time (HH:mm)",
  duration: "Duration in minutes (positive integer)",
  session_type: "AssessmentChild / AssessmentParentFamily / Child / Parent / Family / CheckIn / ProfessionalsMeeting / Other",
  delivery_method: "FaceToFace / Online / Telephone / Email",
  status: "Attended / DNA / Cancelled / Rescheduled — leave blank for unconfirmed",
  occurred_date: "Actual date the session occurred (YYYY-MM-DD) — required when status is set",
  occurred_time: "Actual time the session occurred (HH:mm) — required when status is set",
  missed_reason: "Required when status is DNA or Cancelled. Illness / Holiday / ExamPeriod / AnnualLeave / SchoolTransition / NoShow / Other",
  notes: "Free-text notes",
};
