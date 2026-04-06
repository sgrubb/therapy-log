import { eachWeekOfInterval, format, startOfWeek, addMinutes } from "date-fns";
import { SessionStatus, SESSION_DAY_INDEX } from "@/types/enums";
import type { SessionWithRelations, ClientWithTherapist, ExpectedSession } from "@/types/ipc";

// ── Expected sessions ────────────────────────────────────────────────────────

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
    const weekKey = format(weekDate, "yyyy-MM-dd");
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

// ── Overlap detection ────────────────────────────────────────────────────────

/**
 * Returns sessions that overlap with another session for the same therapist.
 */
export function getOverlappingSessions(sessions: SessionWithRelations[]): SessionWithRelations[] {
  const byTherapist = sessions.reduce(
    (acc, s) => acc.set(s.therapist_id, [...(acc.get(s.therapist_id) ?? []), s]),
    new Map<number, SessionWithRelations[]>(),
  );

  const overlappingIds = new Set(
    Array.from(byTherapist.values()).flatMap((group) =>
      group.flatMap((a, i) =>
        group
          .slice(i + 1)
          .filter((b) =>
            a.scheduled_at < addMinutes(b.scheduled_at, b.duration) &&
            b.scheduled_at < addMinutes(a.scheduled_at, a.duration),
          )
          .flatMap((b) => [a.id, b.id]),
      ),
    ),
  );

  return sessions.filter((s) => overlappingIds.has(s.id));
}

// ── Past-scheduled detection ─────────────────────────────────────────────────

/**
 * Returns true if the session is in the past but still has Scheduled status.
 */
export function getUnconfirmedSessions(sessions: SessionWithRelations[]): SessionWithRelations[] {
  const now = new Date();
  return sessions.filter((s) =>
    s.status === SessionStatus.Scheduled &&
    s.scheduled_at < now,
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getWeekStart(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}
