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
import type { Therapist } from "@/types/ipc";

interface UseCalendarDataOptions {
  selectedTherapists: Therapist[];
  rangeStart: Date;
  rangeEnd: Date;
  showPlaceholders: boolean;
  showOverlappingOnly: boolean;
  unconfirmedOnly: boolean;
  overdueOnly: boolean;
}

export function useCalendarData({
  selectedTherapists,
  rangeStart,
  rangeEnd,
  showPlaceholders,
  showOverlappingOnly: overlappingOnly,
  unconfirmedOnly,
  overdueOnly,
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

  const allEvents = useMemo((): CalendarEvent[] => {
    const filteredSessions = sessions.filter((s) =>
      selectedTherapistIds.has(s.therapist_id),
    );

    const sessionEvents = detectOverlaps(sessionsToEvents(filteredSessions, therapistColors));

    const placeholders = showPlaceholders
      ? generatePlaceholders(clients, sessions, rangeStart, rangeEnd, selectedTherapistIds, therapistColors)
      : [];

    return [...sessionEvents, ...placeholders];
  }, [
    sessions,
    clients,
    selectedTherapistIds,
    therapistColors,
    rangeStart,
    rangeEnd,
    showPlaceholders,
  ]);

  const overdueEvents = useMemo(
    () => allEvents.filter((e) => e.isOverdue),
    [allEvents],
  );

  const unconfirmedEvents = useMemo(
    () => allEvents.filter((e) => e.isUnconfirmed),
    [allEvents],
  );

  const overlappingEvents = useMemo(() => {
    return allEvents.filter((e) => e.isOverlapping);
  }, [allEvents]);

  const events = useMemo(() => {
    if (overdueOnly) {
      return overdueEvents;
    }
    if (unconfirmedOnly) {
      return unconfirmedEvents;
    }
    if (overlappingOnly) {
      return overlappingEvents;
    }
    return allEvents;
  }, [allEvents, overdueEvents, unconfirmedEvents, overlappingEvents, overlappingOnly, unconfirmedOnly, overdueOnly]);

  return {
    events,
    overdueCount: overdueEvents.length,
    unconfirmedCount: unconfirmedEvents.length,
    overlappingCount: overlappingEvents.length,
  };
}
