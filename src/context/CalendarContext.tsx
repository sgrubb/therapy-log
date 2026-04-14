import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import { startOfMonth, endOfMonth, minutesToMilliseconds } from "date-fns";
import { SortDir } from "@shared/types/enums";
import { startOfWeekMon, endOfWeekMon } from "@/lib/datetime-utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import {
  sessionsToEvents,
  expectedToEvents,
  buildTherapistColorMap,
  isOverdue,
  isUnconfirmed,
  isOverlapping,
} from "@/lib/calendar-utils";
import {
  computeOverlappingIds,
  computeUnconfirmedIds,
} from "@/lib/sessions-utils";
import type { View } from "react-big-calendar";
import type { CalendarEvent } from "@/lib/calendar-utils";
import type { Therapist } from "@/types/therapists";



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
  showExpectedSessions: boolean;
  setShowExpectedSessions: (value: boolean) => void;
  showOverlappingOnly: boolean;
  handleOverlappingOnly: (checked: boolean) => void;
  unconfirmedOnly: boolean;
  handleUnconfirmedOnly: (checked: boolean) => void;
  overdueOnly: boolean;
  handleOverdueOnly: (checked: boolean) => void;
  therapistOptions: { value: string; label: string }[];
  events: CalendarEvent[];
  overlappingIds: Set<number>;
  unconfirmedIds: Set<number>;
  overdueCount: number;
  unconfirmedCount: number;
  overlappingCount: number;
  eventPropGetter: (event: CalendarEvent) => { className?: string; style: Record<string, unknown> };
  reset: () => void;
}

const CalendarCtx = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { therapists, selectedTherapistId } = useSelectedTherapist();

  const [view, setViewState] = useState<View>("week");
  const [currentDate, setCurrentDateState] = useState(new Date());

  function setView(v: View) {
    startTransition(() => setViewState(v));
  }

  function setCurrentDate(date: Date) {
    startTransition(() => setCurrentDateState(date));
  }

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getRangeForDate(currentDate, view),
    [currentDate, view],
  );

  const defaultTherapistIds = selectedTherapistId !== null
    ? [selectedTherapistId.toString()]
    : [];

  const [selectedTherapistIds, setSelectedTherapistIds] = useState<string[]>(defaultTherapistIds);
  const [showExpectedSessions, setShowExpectedSessions] = useState(true);
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
    startTransition(() => {
      if (selectedTherapistId !== null) {
        const currentId = selectedTherapistId.toString();
        setSelectedTherapistIds(ids.includes(currentId) ? ids : [currentId, ...ids]);
      } else {
        setSelectedTherapistIds(ids);
      }
    });
  }

  function handleOverdueOnly(checked: boolean) {
    setOverdueOnly(checked);
    if (checked) {
      setShowExpectedSessions(true);
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
    setShowExpectedSessions(true);
    setShowOverlappingOnly(false);
    setUnconfirmedOnly(false);
    setOverdueOnly(false);
  }

  const selectedTherapistIdSet = useMemo(
    () => new Set(selectedTherapists.map((t) => t.id)),
    [selectedTherapists],
  );

  const therapistColors = useMemo(
    () => buildTherapistColorMap(selectedTherapists),
    [selectedTherapists],
  );

  const rangeFilters = useMemo(() => ({
    from: rangeStart,
    to: rangeEnd,
    ...(selectedTherapistIds.length > 0
      ? { therapistIds: selectedTherapistIds.map(Number) }
      : {}),
  }), [rangeStart, rangeEnd, selectedTherapistIds]);

  const { data: rangeSessions } = useSuspenseQuery({
    queryKey: queryKeys.sessions.range(rangeFilters),
    queryFn: () =>
      selectedTherapistIds.length > 0
        ? ipc.listSessionsRange(rangeFilters)
        : Promise.resolve([]),
    refetchInterval: minutesToMilliseconds(1),
  });

  const expectedParams = useMemo(() => ({
    from: rangeStart,
    to: rangeEnd,
    ...(selectedTherapistIds.length > 0
      ? { therapistIds: selectedTherapistIds.map(Number) }
      : {}),
    sortKey: "scheduled_at",
    sortDir: SortDir.Asc,
  }), [rangeStart, rangeEnd, selectedTherapistIds]);

  const { data: expectedSessions } = useSuspenseQuery({
    queryKey: queryKeys.sessions.expected(expectedParams),
    queryFn: () =>
      selectedTherapistIds.length > 0
        ? ipc.listExpectedSessions(expectedParams)
        : Promise.resolve([]),
    refetchInterval: minutesToMilliseconds(1),
  });

  const overlappingIds = useMemo(
    () => computeOverlappingIds(rangeSessions),
    [rangeSessions],
  );

  const unconfirmedIds = useMemo(
    () => computeUnconfirmedIds(rangeSessions, new Date()),
    [rangeSessions],
  );

  const allEvents = useMemo((): CalendarEvent[] => {
    const sessionEvents = sessionsToEvents(rangeSessions, therapistColors);

    const expected = showExpectedSessions
      ? expectedToEvents(expectedSessions, therapistColors, selectedTherapistIdSet)
      : [];

    return [...sessionEvents, ...expected];
  }, [rangeSessions, expectedSessions, therapistColors, selectedTherapistIdSet, showExpectedSessions]);

  const overdueEvents = useMemo(
    () => allEvents.filter((e) => isOverdue(e)),
    [allEvents],
  );

  const overlappingEvents = useMemo(
    () => allEvents.filter((e) => isOverlapping(e, overlappingIds)),
    [allEvents, overlappingIds],
  );

  const unconfirmedEvents = useMemo(
    () => allEvents.filter((e) => isUnconfirmed(e, unconfirmedIds)),
    [allEvents, unconfirmedIds],
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
    className: event.isExpected ? "is-expected" : undefined,
    style: {
      backgroundColor: event.color,
      opacity: event.isExpected ? 0.45 : 1,
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
        showExpectedSessions, setShowExpectedSessions,
        showOverlappingOnly, handleOverlappingOnly,
        unconfirmedOnly, handleUnconfirmedOnly,
        overdueOnly, handleOverdueOnly,
        therapistOptions,
        events,
        overlappingIds,
        unconfirmedIds,
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
