import { useEffect, useMemo, useState } from "react";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import {
  sessionsToEvents,
  generatePlaceholders,
  detectOverlaps,
  buildTherapistColorMap,
  getOverduePlaceholders,
} from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/lib/calendar-utils";
import type { SessionWithRelations, ClientWithTherapist, Therapist } from "@/types/ipc";

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
  const [sessions, setSessions] = useState<SessionWithRelations[]>([]);
  const [clients, setClients] = useState<ClientWithTherapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, c] = await Promise.all([ipc.listSessions(), ipc.listClients()]);
        setSessions(s);
        setClients(c);
      } catch (err) {
        log.error("Failed to load calendar data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

    let evts = sessionsToEvents(filteredSessions, therapistColors);
    evts = detectOverlaps(evts);

    if (showPlaceholders) {
      const placeholders = generatePlaceholders(
        clients,
        sessions,
        rangeStart,
        rangeEnd,
        selectedTherapistIds,
        therapistColors,
      );
      evts = [...evts, ...placeholders];
    }

    if (showOverlappingOnly) {
      evts = evts.filter((e) => e.isOverlapping && !e.isPlaceholder);
    }

    return evts;
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

  const overdueCount = useMemo(
    () => getOverduePlaceholders(clients, sessions, therapistColors, selectedTherapistIds).length,
    [clients, sessions, therapistColors, selectedTherapistIds],
  );

  return { events, loading, overdueCount };
}
