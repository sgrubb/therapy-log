import { eachWeekOfInterval } from "date-fns";
import { SESSION_DAY_INDEX, SESSION_TYPE_NAMES } from "@/types/enums";
import type { SessionWithRelations, ClientWithTherapist, Therapist } from "@/types/ipc";

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
  const openClients = clients.filter(
    (c) =>
      !c.is_closed &&
      c.session_day !== null &&
      c.session_time !== null &&
      selectedTherapistIds.has(c.therapist_id),
  );

  const coveredWeeks = new Set(
    sessions.map((s) => `${s.client_id}-${getWeekStart(s.scheduled_at)}`),
  );

  // Build an array of each Monday in the visible range
  const weekStarts = eachWeekOfInterval(
    { start: rangeStart, end: rangeEnd },
    { weekStartsOn: 1 },
  );

  return weekStarts.flatMap((weekDate) => {
    const weekKey = weekDate.toISOString().split("T")[0]!;
    return openClients
      .filter((client) => !coveredWeeks.has(`${client.id}-${weekKey}`))
      .flatMap((client) => {
         const dayIdx = SESSION_DAY_INDEX[client.session_day!];
        if (dayIdx === undefined) {
          return [];
        }

        // dayIdx: Sun=0, Mon=1…Sat=6 → offset from Monday
        const daysFromMonday = dayIdx === 0 ? 6 : dayIdx - 1;
        const sessionDate = new Date(weekDate);
        sessionDate.setDate(weekDate.getDate() + daysFromMonday);

        if (sessionDate < rangeStart || sessionDate > rangeEnd) {
          return [];
        }

        const [hStr, mStr] = client.session_time!.split(":");
        sessionDate.setHours(Number(hStr ?? 0), Number(mStr ?? 0), 0, 0);
        const durationMs = (client.session_duration ?? 60) * 60_000;

        return [{
          id: `placeholder-${client.id}-${weekKey}`,
          title: `${client.first_name} ${client.last_name} (expected)`,
          start: new Date(sessionDate),
          end: new Date(sessionDate.getTime() + durationMs),
          resourceId: client.therapist_id,
          isPlaceholder: true,
          isOverlapping: false,
          clientId: client.id,
          color: therapistColors.get(client.therapist_id) ?? THERAPIST_COLORS[0]!,
        }];
      });
  });
}

export function detectOverlaps(events: CalendarEvent[]): CalendarEvent[] {
  const byTherapist = events
    .filter((e) => !e.isPlaceholder)
    .reduce((sessions, e) => {
      const therapistSessions = sessions.get(e.resourceId) ?? [];
      therapistSessions.push(e);
      sessions.set(e.resourceId, therapistSessions);
      return sessions;
    }, new Map<number, CalendarEvent[]>());

  const overlappingIds = new Set(
    Array.from(byTherapist.values()).flatMap((sessions) =>
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

export function getOverduePlaceholders(
  clients: ClientWithTherapist[],
  sessions: SessionWithRelations[],
  therapistColors: Map<number, string>,
  selectedTherapistIds?: Set<number>,
  weeksBack = 12,
): CalendarEvent[] {
  const now = new Date();
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
    23, 59, 59, 999
  );
  const rangeStart = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate() - weeksBack * 7,
    0, 0, 0, 0
  );

  const ids = selectedTherapistIds ?? new Set(clients.map((c) => c.therapist_id));

  return generatePlaceholders(clients, sessions, rangeStart, yesterday, ids, therapistColors);
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

// ── Helpers ────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): string {
  return getWeekStartDate(date).toISOString().split("T")[0]!;
}

function getWeekStartDate(date: Date): Date {
  const day = date.getDay(); // 0 = Sun, 1 = Mon…
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + diff,
    0, 0, 0, 0
  );
}
