import { SessionStatus, SESSION_TYPE_NAMES } from "@/types/enums";
import type { SessionWithRelations, ClientWithTherapist, Therapist } from "@/types/ipc";
import { getExpectedSessions } from "@/lib/sessions-utils";
import { getWeekStart } from "@/lib/datetime-utils";

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
  isPlaceholder: boolean;
  isOverdue: boolean;
  isUnconfirmed: boolean;
  isOverlapping: boolean;
  clientId: number;
  sessionId?: number;
  color: string;
}

export function sessionsToEvents(
  sessions: SessionWithRelations[],
  therapistColors: Map<number, string>,
): CalendarEvent[] {
  return sessions.map((s) => ({
    id: `session-${s.id}`,
    title: `${s.client.first_name} ${s.client.last_name} — ${SESSION_TYPE_NAMES[s.session_type] ?? s.session_type}`,
    start: s.scheduled_at,
    end: new Date(s.scheduled_at.getTime() + s.duration * 60_000),
    resourceId: s.therapist_id,
    isPlaceholder: false,
    isOverdue: false,
    isUnconfirmed: s.status === SessionStatus.Scheduled && s.scheduled_at < new Date(),
    isOverlapping: false,
    clientId: s.client_id,
    sessionId: s.id,
    color: therapistColors.get(s.therapist_id) ?? THERAPIST_COLORS[0]!,
  }));
}

export function generatePlaceholders(
  clients: ClientWithTherapist[],
  sessions: SessionWithRelations[],
  rangeStart: Date,
  rangeEnd: Date,
  selectedTherapistIds: Set<number>,
  therapistColors: Map<number, string>,
): CalendarEvent[] {
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  return getExpectedSessions(clients, sessions, rangeStart, rangeEnd, selectedTherapistIds)
    .map((expected) => {
      const weekKey = getWeekStart(expected.start);
      const client = clientMap.get(expected.clientId);
      const title = client
        ? `${client.first_name} ${client.last_name} (expected)`
        : "Unknown (expected)";
      return {
        id: `placeholder-${expected.clientId}-${weekKey}`,
        title,
        start: expected.start,
        end: expected.end,
        resourceId: expected.therapistId,
        isPlaceholder: true,
        isOverdue: expected.start < new Date(),
        isUnconfirmed: false,
        isOverlapping: false,
        clientId: expected.clientId,
        color: therapistColors.get(expected.therapistId) ?? THERAPIST_COLORS[0]!,
      };
    });
}

export function detectOverlaps(events: CalendarEvent[]): CalendarEvent[] {
  const now = new Date();
  const byTherapistEvents = events
    .filter((e) => !e.isPlaceholder && e.start >= now)
    .reduce((btes, e) => {
      const therapistSessions = btes.get(e.resourceId) ?? [];
      therapistSessions.push(e);
      btes.set(e.resourceId, therapistSessions);
      return btes;
    }, new Map<number, CalendarEvent[]>());

  const overlappingIds = new Set(
    Array.from(byTherapistEvents.values()).flatMap((sessions) =>
      sessions.flatMap((a, i) =>
        sessions
          .slice(i + 1)
          .filter((b) => a.start < b.end && b.start < a.end)
          .flatMap((b) => [a.id, b.id]),
      ),
    ),
  );

  return events.map((e) =>
    overlappingIds.has(e.id) ? { ...e, isOverlapping: true } : e,
  );
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

