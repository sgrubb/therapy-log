import { format, subDays, minutesToHours, hoursToMinutes, minutesToMilliseconds } from "date-fns";
import { SESSION_DAY_INDEX } from "@/types/enums";
import type { Duration } from "@/types/ui";
import type { SessionWithRelations } from "@/types/sessions";

// ── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the most recent occurrence (including today) of the given day name
 * as a "yyyy-MM-dd" string.
 */
export function mostRecentOccurrence(dayName: string): string {
  const target = SESSION_DAY_INDEX[dayName as keyof typeof SESSION_DAY_INDEX];
  if (target === undefined) {
    return "";
  }
  const today = new Date();
  const daysBack = (today.getDay() - target + 7) % 7;
  return format(subDays(today, daysBack), "yyyy-MM-dd");
}

export function toDuration(totalMinutes: number): Duration {
  return { hours: minutesToHours(totalMinutes), minutes: totalMinutes % 60 };
}

export function fromDuration(d: Duration): number {
  return hoursToMinutes(d.hours) + d.minutes;
}

// ── Overlap / unconfirmed computation ────────────────────────────────────────

function sessionOverlaps(
  aStart: Date,
  aDurationMins: number,
  bStart: Date,
  bDurationMins: number,
): boolean {
  const aEnd = new Date(aStart.getTime() + minutesToMilliseconds(aDurationMins));
  const bEnd = new Date(bStart.getTime() + minutesToMilliseconds(bDurationMins));
  return aStart < bEnd && bStart < aEnd;
}

export function computeOverlappingIds(sessions: SessionWithRelations[]): Set<number> {
  const byTherapist = sessions.reduce((acc, s) => {
    const list = acc.get(s.therapist_id) ?? [];
    list.push(s);
    acc.set(s.therapist_id, list);
    return acc;
  }, new Map<number, SessionWithRelations[]>());

  return new Set(
    Array.from(byTherapist.values()).flatMap((group) =>
      group.flatMap((a, i) =>
        group
          .slice(i + 1)
          .filter((b) => sessionOverlaps(a.scheduled_at, a.duration, b.scheduled_at, b.duration))
          .flatMap((b) => [a.id, b.id]),
      ),
    ),
  );
}

export function computeUnconfirmedIds(sessions: SessionWithRelations[], now: Date): Set<number> {
  return new Set(
    sessions
      .filter((s) => s.status === "Scheduled" && s.scheduled_at < now)
      .map((s) => s.id),
  );
}
