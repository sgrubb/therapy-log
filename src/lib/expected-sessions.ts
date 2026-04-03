import { eachWeekOfInterval } from "date-fns";
import { SESSION_DAY_INDEX } from "@/types/enums";
import type { SessionWithRelations, ClientWithTherapist } from "@/types/ipc";

export interface ExpectedSession {
  id: string;
  clientId: number;
  therapistId: number;
  start: Date;
  end: Date;
}

/**
 * Returns expected (placeholder) sessions for open clients with a session schedule,
 * within the given date range. Respects each client's start_date.
 */
export function getExpectedSessions(
  clients: ClientWithTherapist[],
  sessions: SessionWithRelations[],
  rangeStart: Date,
  rangeEnd: Date,
  therapistIds?: Set<number>,
): ExpectedSession[] {
  const ids = therapistIds ?? new Set(clients.map((c) => c.therapist_id));

  const eligibleClients = clients.filter(
    (c) =>
      !c.is_closed &&
      c.session_day !== null &&
      c.session_time !== null &&
      ids.has(c.therapist_id),
  );

  const coveredWeeks = new Set(
    sessions.map((s) => `${s.client_id}-${getWeekStart(s.scheduled_at)}`),
  );

  const weekStarts = eachWeekOfInterval(
    { start: rangeStart, end: rangeEnd },
    { weekStartsOn: 1 },
  );

  return weekStarts.flatMap((weekDate) => {
    const weekKey = weekDate.toISOString().split("T")[0]!;
    return eligibleClients
      .filter((client) => !coveredWeeks.has(`${client.id}-${weekKey}`))
      .flatMap((client): ExpectedSession[] => {
        const dayIdx = SESSION_DAY_INDEX[client.session_day!];
        if (dayIdx === undefined) {
          return [];
        }

        const daysFromMonday = dayIdx === 0 ? 6 : dayIdx - 1;
        const sessionDate = new Date(weekDate);
        sessionDate.setDate(weekDate.getDate() + daysFromMonday);

        // Respect client start_date — don't generate sessions before therapy began
        const effectiveStart = client.start_date > rangeStart ? client.start_date : rangeStart;
        if (sessionDate < effectiveStart || sessionDate > rangeEnd) {
          return [];
        }

        const [hStr, mStr] = client.session_time!.split(":");
        sessionDate.setHours(Number(hStr ?? 0), Number(mStr ?? 0), 0, 0);
        const durationMs = (client.session_duration ?? 60) * 60_000;

        return [{
          id: `expected-${client.id}-${weekKey}`,
          clientId: client.id,
          therapistId: client.therapist_id,
          start: new Date(sessionDate),
          end: new Date(sessionDate.getTime() + durationMs),
        }];
      });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getWeekStart(date: Date): string {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + diff,
    0, 0, 0, 0,
  ).toISOString().split("T")[0]!;
}
