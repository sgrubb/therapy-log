import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { startOfWeekMon, endOfWeekMon } from "@/lib/datetime-utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import {
  sessionsToEvents,
  generatePlaceholders,
  detectOverlaps,
  buildTherapistColorMap,
} from "@/lib/calendar-utils";
import type { View } from "react-big-calendar";
import type { CalendarEvent } from "@/lib/calendar-utils";
import type { Therapist } from "@/types/ipc";

function getRangeForDate(date: Date, view: View): { start: Date; end: Date } {
  if (view === "week") {
    return {
      start: startOfWeekMon(date),
      end: endOfWeekMon(date),
    };
  }
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

interface CalendarContextValue {
  view: View;
  setView: (view: View) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  rangeStart: Date;
  rangeEnd: Date;
  selectedTherapistIds: string[];
  setTherapistIds: (ids: string[]) => void;
  showPlaceholders: boolean;
  setShowPlaceholders: (value: boolean) => void;
  showOverlappingOnly: boolean;
  handleOverlappingOnly: (checked: boolean) => void;
  unconfirmedOnly: boolean;
  handleUnconfirmedOnly: (checked: boolean) => void;
  overdueOnly: boolean;
  handleOverdueOnly: (checked: boolean) => void;
  therapistOptions: { value: string; label: string }[];
  events: CalendarEvent[];
  overdueCount: number;
  unconfirmedCount: number;
  overlappingCount: number;
  eventPropGetter: (event: CalendarEvent) => { className?: string; style: Record<string, unknown> };
  reset: () => void;
}

const CalendarCtx = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { therapists, selectedTherapistId } = useSelectedTherapist();

  const [view, setView] = useState<View>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getRangeForDate(currentDate, view),
    [currentDate, view],
  );

  const defaultTherapistIds = selectedTherapistId !== null
    ? [selectedTherapistId.toString()]
    : [];

  const [selectedTherapistIds, setSelectedTherapistIds] = useState<string[]>(defaultTherapistIds);
  const [showPlaceholders, setShowPlaceholders] = useState(true);
  const [showOverlappingOnly, setShowOverlappingOnly] = useState(false);
  const [unconfirmedOnly, setUnconfirmedOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => {
    if (selectedTherapistId !== null) {
      setSelectedTherapistIds((prev) => {
        const id = selectedTherapistId.toString();
        return prev.includes(id) ? prev : [id, ...prev];
      });
    }
  }, [selectedTherapistId]);

  const therapistOptions = useMemo(
    () => therapists.map((t) => ({ value: t.id.toString(), label: `${t.first_name} ${t.last_name}` })),
    [therapists],
  );

  const selectedTherapists = useMemo(
    (): Therapist[] =>
      selectedTherapistIds
        .map((id) => therapists.find((t) => t.id.toString() === id))
        .filter((t): t is Therapist => t !== undefined),
    [selectedTherapistIds, therapists],
  );

  function setTherapistIds(ids: string[]) {
    if (selectedTherapistId !== null) {
      const currentId = selectedTherapistId.toString();
      setSelectedTherapistIds(ids.includes(currentId) ? ids : [currentId, ...ids]);
    } else {
      setSelectedTherapistIds(ids);
    }
  }

  function handleOverdueOnly(checked: boolean) {
    setOverdueOnly(checked);
    if (checked) {
      setShowPlaceholders(true);
      setUnconfirmedOnly(false);
      setShowOverlappingOnly(false);
    }
  }

  function handleUnconfirmedOnly(checked: boolean) {
    setUnconfirmedOnly(checked);
    if (checked) {
      setOverdueOnly(false);
      setShowOverlappingOnly(false);
    }
  }

  function handleOverlappingOnly(checked: boolean) {
    setShowOverlappingOnly(checked);
    if (checked) {
      setOverdueOnly(false);
      setUnconfirmedOnly(false);
    }
  }

  function reset() {
    setSelectedTherapistIds(selectedTherapistId !== null ? [selectedTherapistId.toString()] : []);
    setShowPlaceholders(true);
    setShowOverlappingOnly(false);
    setUnconfirmedOnly(false);
    setOverdueOnly(false);
  }

  // Calendar data
  const { data: sessions } = useSuspenseQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: () => ipc.listSessions(),
  });

  const { data: clients } = useSuspenseQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => ipc.listClients(),
  });

  const selectedTherapistIdSet = useMemo(
    () => new Set(selectedTherapists.map((t) => t.id)),
    [selectedTherapists],
  );

  const therapistColors = useMemo(
    () => buildTherapistColorMap(selectedTherapists),
    [selectedTherapists],
  );

  const allEvents = useMemo((): CalendarEvent[] => {
    const filteredSessions = sessions.filter((s) =>
      selectedTherapistIdSet.has(s.therapist_id),
    );

    const sessionEvents = detectOverlaps(sessionsToEvents(filteredSessions, therapistColors));

    const placeholders = showPlaceholders
      ? generatePlaceholders(clients, sessions, rangeStart, rangeEnd, selectedTherapistIdSet, therapistColors)
      : [];

    return [...sessionEvents, ...placeholders];
  }, [sessions, clients, selectedTherapistIdSet, therapistColors, rangeStart, rangeEnd, showPlaceholders]);

  const overdueEvents = useMemo(
    () => allEvents.filter((e) => e.isOverdue),
    [allEvents],
  );

  const unconfirmedEvents = useMemo(
    () => allEvents.filter((e) => e.isUnconfirmed),
    [allEvents],
  );

  const overlappingEvents = useMemo(
    () => allEvents.filter((e) => e.isOverlapping),
    [allEvents],
  );

  const events = useMemo(() => {
    if (overdueOnly) {
      return overdueEvents;
    }
    if (unconfirmedOnly) {
      return unconfirmedEvents;
    }
    if (showOverlappingOnly) {
      return overlappingEvents;
    }
    return allEvents;
  }, [allEvents, overdueEvents, unconfirmedEvents, overlappingEvents, showOverlappingOnly, unconfirmedOnly, overdueOnly]);

  const eventPropGetter = useCallback((event: CalendarEvent) => ({
    className: event.isPlaceholder ? "is-placeholder" : undefined,
    style: {
      backgroundColor: event.color,
      opacity: event.isPlaceholder ? 0.45 : 1,
      border: "none",
    },
  }), []);

  return (
    <CalendarCtx.Provider
      value={{
        view, setView,
        currentDate, setCurrentDate,
        rangeStart, rangeEnd,
        selectedTherapistIds, setTherapistIds,
        showPlaceholders, setShowPlaceholders,
        showOverlappingOnly, handleOverlappingOnly,
        unconfirmedOnly, handleUnconfirmedOnly,
        overdueOnly, handleOverdueOnly,
        therapistOptions,
        events,
        overdueCount: overdueEvents.length,
        unconfirmedCount: unconfirmedEvents.length,
        overlappingCount: overlappingEvents.length,
        eventPropGetter,
        reset,
      }}
    >
      {children}
    </CalendarCtx.Provider>
  );
}

export function useCalendar(): CalendarContextValue {
  const ctx = useContext(CalendarCtx);
  if (!ctx) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return ctx;
}
