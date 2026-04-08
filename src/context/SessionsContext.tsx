import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { format, parse, startOfMonth, endOfMonth, endOfDay } from "date-fns";
import { startOfWeekMon, endOfWeekMon } from "@/lib/datetime-utils";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { getExpectedSessions, getOverlappingSessions, getUnconfirmedSessions } from "@/lib/sessions-utils";
import type { ClientWithTherapist, SessionWithRelations } from "@/types/ipc";

export const DatePreset = {
  ThisWeek: "this_week",
  ThisMonth: "this_month",
  AllTime: "all_time",
  Custom: "custom",
} as const;
export type DatePreset = (typeof DatePreset)[keyof typeof DatePreset];

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  if (preset === DatePreset.ThisWeek) {
    return {
      from: format(startOfWeekMon(now), "yyyy-MM-dd"),
      to: format(endOfWeekMon(now), "yyyy-MM-dd"),
    };
  }
  if (preset === DatePreset.ThisMonth) {
    return {
      from: format(startOfMonth(now), "yyyy-MM-dd"),
      to: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }
  return { from: "", to: "" };
}

export interface ExpectedSessionRow {
  id: string;
  start: Date;
  clientName: string;
  therapistName: string;
  isOverdue: boolean;
  logUrl: string;
}

interface SessionContextValue {
  clientFilter: string;
  setClientFilter: (value: string) => void;
  therapistFilter: string;
  setTherapistFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  dateFromFilter: string;
  setDateFromFilter: (value: string) => void;
  dateToFilter: string;
  setDateToFilter: (value: string) => void;
  overdueOnly: boolean;
  handleOverdueOnly: (checked: boolean) => void;
  unconfirmedOnly: boolean;
  handleUnconfirmedOnly: (checked: boolean) => void;
  overlappingOnly: boolean;
  handleOverlappingOnly: (checked: boolean) => void;
  expectedOpen: boolean;
  setExpectedOpen: (value: boolean) => void;
  filtered: SessionWithRelations[];
  displayedSessions: SessionWithRelations[];
  displayedExpectedRows: ExpectedSessionRow[];
  showExpectedSection: boolean;
  overlappingIds: Set<number>;
  unconfirmedIds: Set<number>;
  overdueCount: number;
  unconfirmedCount: number;
  overlappingCount: number;
  uniqueClients: { id: number; name: string }[];
  sortedTherapists: { id: number; first_name: string; last_name: string }[];
  showMine: boolean;
  selectedTherapistId: number | null;
  reset: () => void;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  sessions: SessionWithRelations[];
  clients: ClientWithTherapist[];
  children: ReactNode;
}

export function SessionProvider({ sessions, clients, children }: SessionProviderProps) {
  const { therapists, selectedTherapistId } = useSelectedTherapist();

  const [clientFilter, setClientFilter] = useState("all");
  const [therapistFilter, setTherapistFilter] = useState(
    () => selectedTherapistId !== null ? String(selectedTherapistId) : "all",
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [datePreset, setDatePresetState] = useState<DatePreset>(DatePreset.ThisWeek);
  const initialRange = getPresetRange(DatePreset.ThisWeek);
  const [dateFromFilter, setDateFromFilterState] = useState(initialRange.from);
  const [dateToFilter, setDateToFilterState] = useState(initialRange.to);

  const [overdueOnly, setOverdueOnly] = useState(false);
  const [unconfirmedOnly, setUnconfirmedOnly] = useState(false);
  const [overlappingOnly, setOverlappingOnly] = useState(false);
  const [expectedOpen, setExpectedOpen] = useState(false);

  function handleOverdueOnly(checked: boolean) {
    setOverdueOnly(checked);
    if (checked) {
      setUnconfirmedOnly(false);
      setOverlappingOnly(false);
      setExpectedOpen(true);
    }
  }

  function handleUnconfirmedOnly(checked: boolean) {
    setUnconfirmedOnly(checked);
    if (checked) {
      setOverdueOnly(false);
      setOverlappingOnly(false);
    }
  }

  function handleOverlappingOnly(checked: boolean) {
    setOverlappingOnly(checked);
    if (checked) {
      setOverdueOnly(false);
      setUnconfirmedOnly(false);
    }
  }

  function setDatePreset(preset: DatePreset) {
    setDatePresetState(preset);
    if (preset !== DatePreset.Custom) {
      const range = getPresetRange(preset);
      setDateFromFilterState(range.from);
      setDateToFilterState(range.to);
    }
  }

  function setDateFromFilter(value: string) {
    setDateFromFilterState(value);
    setDatePresetState(DatePreset.Custom);
  }

  function setDateToFilter(value: string) {
    setDateToFilterState(value);
    setDatePresetState(DatePreset.Custom);
  }

  useEffect(() => {
    setTherapistFilter(selectedTherapistId !== null ? String(selectedTherapistId) : "all");
  }, [selectedTherapistId]);

  const showMine = selectedTherapistId !== null && therapistFilter === String(selectedTherapistId);

  const sortedTherapists = useMemo(
    () => [...therapists].sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`;
      const nameB = `${b.last_name} ${b.first_name}`;
      return nameA.localeCompare(nameB);
    }),
    [therapists],
  );

  const uniqueClients = useMemo(() => {
    const { clients: derived } = sessions.reduce(
      (acc, s) => {
        if (!acc.seen.has(s.client_id)) {
          acc.seen.add(s.client_id);
          acc.clients.push({ id: s.client_id, name: `${s.client.last_name}, ${s.client.first_name}` });
        }
        return acc;
      },
      { seen: new Set<number>(), clients: [] as { id: number; name: string }[] },
    );
    return derived.sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  const filtered = useMemo(() => {
    const from = dateFromFilter ? parse(dateFromFilter, "yyyy-MM-dd", new Date()) : null;
    const to = dateToFilter ? endOfDay(parse(dateToFilter, "yyyy-MM-dd", new Date())) : null;

    return sessions
      .filter((s) => clientFilter === "all" || s.client_id === Number(clientFilter))
      .filter((s) => therapistFilter === "all" || s.therapist_id === Number(therapistFilter))
      .filter((s) => statusFilter === "all" || s.status === statusFilter)
      .filter((s) => !from || s.scheduled_at >= from)
      .filter((s) => !to || s.scheduled_at <= to);
  }, [sessions, clientFilter, therapistFilter, statusFilter, dateFromFilter, dateToFilter]);

  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );

  const hasBoundedRange = dateFromFilter !== "" && dateToFilter !== "";

  const expectedSessionRows = useMemo((): ExpectedSessionRow[] => {
    if (!hasBoundedRange) {
      return [];
    }

    const now = new Date();
    const rangeStart = parse(dateFromFilter, "yyyy-MM-dd", new Date());
    const rangeEnd = endOfDay(parse(dateToFilter, "yyyy-MM-dd", new Date()));

    const therapistIds = therapistFilter !== "all"
      ? new Set([Number(therapistFilter)])
      : undefined;

    return getExpectedSessions(clients, sessions, rangeStart, rangeEnd, therapistIds)
      .filter((s) => clientFilter === "all" || s.clientId === Number(clientFilter))
      .map((s) => {
        const client = clientMap.get(s.clientId);
        const therapist = client?.therapist;
        return {
          id: s.id,
          start: s.start,
          clientName: client ? `${client.first_name} ${client.last_name}` : "—",
          therapistName: therapist ? `${therapist.first_name} ${therapist.last_name}` : "—",
          isOverdue: s.start < now,
          logUrl: `/sessions/new?clientId=${s.clientId}&date=${format(s.start, "yyyy-MM-dd")}&time=${format(s.start, "HH:mm")}`,
        };
      });
  }, [clients, sessions, therapistFilter, clientFilter, dateFromFilter, dateToFilter, clientMap, hasBoundedRange]);

  const overdueCount = useMemo(
    () => expectedSessionRows.filter((s) => s.isOverdue).length,
    [expectedSessionRows],
  );

  const overlappingIds = useMemo(
    () => new Set(getOverlappingSessions(filtered).map((s) => s.id)),
    [filtered],
  );

  const unconfirmedIds = useMemo(
    () => new Set(getUnconfirmedSessions(filtered).map((s) => s.id)),
    [filtered],
  );

  const overlappingCount = useMemo(
    () => filtered.filter((s) => overlappingIds.has(s.id) && s.scheduled_at >= new Date()).length,
    [filtered, overlappingIds],
  );

  const unconfirmedCount = unconfirmedIds.size;

  const displayedSessions = useMemo(() => {
    if (unconfirmedOnly) {
      return filtered.filter((s) => unconfirmedIds.has(s.id));
    }
    if (overlappingOnly) {
      return filtered.filter((s) => overlappingIds.has(s.id) && s.scheduled_at >= new Date());
    }
    return filtered;
  }, [filtered, unconfirmedOnly, overlappingOnly, unconfirmedIds, overlappingIds]);

  const displayedExpectedRows = useMemo(
    () => overdueOnly
      ? expectedSessionRows.filter((s) => s.isOverdue)
      : expectedSessionRows,
    [expectedSessionRows, overdueOnly],
  );

  const showExpectedSection = hasBoundedRange
    && displayedExpectedRows.length > 0
    && !unconfirmedOnly
    && !overlappingOnly;

  function reset() {
    const range = getPresetRange(DatePreset.ThisWeek);
    setClientFilter("all");
    setTherapistFilter(selectedTherapistId !== null ? String(selectedTherapistId) : "all");
    setStatusFilter("all");
    setDatePresetState(DatePreset.ThisWeek);
    setDateFromFilterState(range.from);
    setDateToFilterState(range.to);
    setOverdueOnly(false);
    setUnconfirmedOnly(false);
    setOverlappingOnly(false);
    setExpectedOpen(false);
  }

  return (
    <SessionCtx.Provider
      value={{
        clientFilter, setClientFilter,
        therapistFilter, setTherapistFilter,
        statusFilter, setStatusFilter,
        datePreset, setDatePreset,
        dateFromFilter, setDateFromFilter,
        dateToFilter, setDateToFilter,
        overdueOnly, handleOverdueOnly,
        unconfirmedOnly, handleUnconfirmedOnly,
        overlappingOnly, handleOverlappingOnly,
        expectedOpen, setExpectedOpen,
        filtered, displayedSessions,
        displayedExpectedRows, showExpectedSection,
        overlappingIds, unconfirmedIds,
        overdueCount, unconfirmedCount, overlappingCount,
        uniqueClients, sortedTherapists,
        showMine, selectedTherapistId,
        reset,
      }}
    >
      {children}
    </SessionCtx.Provider>
  );
}

export function useSessions(): SessionContextValue {
  const ctx = useContext(SessionCtx);
  if (!ctx) {
    throw new Error("useSessions must be used within a SessionProvider");
  }
  return ctx;
}
