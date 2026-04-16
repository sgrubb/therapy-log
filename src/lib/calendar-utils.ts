import { SESSION_TYPE_NAMES } from "@/lib/display";
import type { SessionWithClientAndTherapist } from "@shared/types/sessions";
import type { Therapist } from "@shared/types/therapists";
import type { ExpectedSession } from "@shared/types/sessions";
import { getWeekStart } from "@/lib/datetime-utils";
import { minutesToMilliseconds } from "date-fns";

export const THERAPIST_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
];

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId: number;
  isExpected: boolean;
  clientId: number;
  sessionId?: number;
  color: string;
}

export function isOverdue(event: CalendarEvent, overdueIds: Set<string>): boolean {
  return event.isExpected && overdueIds.has(event.id);
}

export function isUnconfirmed(event: CalendarEvent, unconfirmedIds: Set<number>): boolean {
  return !event.isExpected && event.sessionId !== undefined && unconfirmedIds.has(event.sessionId);
}

export function isOverlapping(event: CalendarEvent, overlappingIds: Set<number>): boolean {
  return !event.isExpected && event.sessionId !== undefined && overlappingIds.has(event.sessionId);
}

export function sessionsToEvents(
  sessions: SessionWithClientAndTherapist[],
  therapistColors: Map<number, string>,
): CalendarEvent[] {
  return sessions.map((s) => ({
    id: `session-${s.id}`,
    title: `${s.client.first_name} ${s.client.last_name} — ${SESSION_TYPE_NAMES[s.session_type] ?? s.session_type}`,
    start: s.scheduled_at,
    end: new Date(s.scheduled_at.getTime() + s.duration * 60_000),
    resourceId: s.therapist_id,
    isExpected: false,
    clientId: s.client_id,
    sessionId: s.id,
    color: therapistColors.get(s.therapist_id) ?? THERAPIST_COLORS[0]!,
  }));
}

export function expectedToEvents(
  expectedSessions: ExpectedSession[],
  therapistColors: Map<number, string>,
  selectedTherapistIds: Set<number>,
): CalendarEvent[] {
  return expectedSessions
    .filter((e) => selectedTherapistIds.size === 0 || selectedTherapistIds.has(e.therapist_id))
    .map((expected) => ({
      id: `expected-${expected.client_id}-${getWeekStart(expected.scheduled_at)}`,
      title: `${expected.client.first_name} ${expected.client.last_name} (expected)`,
      start: expected.scheduled_at,
      end: new Date(expected.scheduled_at.getTime() + minutesToMilliseconds(expected.duration)),
      resourceId: expected.therapist_id,
      isExpected: true,
      clientId: expected.client_id,
      color: therapistColors.get(expected.therapist_id) ?? THERAPIST_COLORS[0]!,
    }));
}

export function buildTherapistColorMap(
  selectedTherapists: Therapist[],
): Map<number, string> {
  const map = new Map<number, string>();
  selectedTherapists.forEach((t, i) => {
    map.set(t.id, THERAPIST_COLORS[i % THERAPIST_COLORS.length]!);
  });
  return map;
}
