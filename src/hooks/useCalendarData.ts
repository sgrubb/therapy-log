import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import {
  sessionsToEvents,
  generatePlaceholders,
  detectOverlaps,
  buildTherapistColorMap,
} from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/lib/calendar-utils";
import { getExpectedSessions } from "@/lib/expected-sessions";
import type { Therapist } from "@/types/ipc";

interface UseCalendarDataOptions {
  selectedTherapists: Therapist[];
  rangeStart: Date;
  rangeEnd: Date;
  showPlaceholders: boolean;
  showOverlappingOnly: boolean;
}

export function useCalendarData({
  selectedTherapists,
  rangeStart,
  rangeEnd,
  showPlaceholders,
  showOverlappingOnly,
}: UseCalendarDataOptions) {
  const { data: sessions } = useSuspenseQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: () => ipc.listSessions(),
  });

  const { data: clients } = useSuspenseQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => ipc.listClients(),
  });

  const selectedTherapistIds = useMemo(
    () => new Set(selectedTherapists.map((t) => t.id)),
    [selectedTherapists],
  );

  const therapistColors = useMemo(
    () => buildTherapistColorMap(selectedTherapists),
    [selectedTherapists],
  );

  const events = useMemo((): CalendarEvent[] => {
    const filteredSessions = sessions.filter((s) =>
      selectedTherapistIds.has(s.therapist_id),
    );

    const sessionEvents = detectOverlaps(sessionsToEvents(filteredSessions, therapistColors));

    const placeholders = showPlaceholders
      ? generatePlaceholders(clients, sessions, rangeStart, rangeEnd, selectedTherapistIds, therapistColors)
      : [];

    const combined = [...sessionEvents, ...placeholders];

    return showOverlappingOnly
      ? combined.filter((e) => e.isOverlapping && !e.isPlaceholder)
      : combined;
  }, [
    sessions,
    clients,
    selectedTherapistIds,
    therapistColors,
    rangeStart,
    rangeEnd,
    showPlaceholders,
    showOverlappingOnly,
  ]);

  // Clamp the range end to now so future expected sessions aren't counted as overdue.
  const overdueRangeEnd = useMemo(() => {
    const now = new Date();
    return rangeEnd < now ? rangeEnd : now;
  }, [rangeEnd]);

  const overdueCount = useMemo(
    () => getExpectedSessions(clients, sessions, rangeStart, overdueRangeEnd, selectedTherapistIds).length,
    [clients, sessions, selectedTherapistIds, rangeStart, overdueRangeEnd],
  );

  return { events, overdueCount };
}
