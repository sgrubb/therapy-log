import { createContext, useContext, useEffect, useMemo, useState, startTransition, type ReactNode } from "react";
import { SortDir } from "@shared/types/enums";
import { format, parse, startOfMonth, endOfMonth, endOfDay, minutesToMilliseconds } from "date-fns";
import { startOfWeekMon, endOfWeekMon } from "@/lib/utils/datetime";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/query-keys";
import type { SessionWithClientAndTherapist } from "@shared/types/sessions";
import type { ClientWithTherapist } from "@shared/types/clients";
import type { ExpectedSession, SessionFilters, SessionListParams } from "@shared/types/sessions";
import {
  computeOverlappingIds,
  computeUnconfirmedIds,
  computeOverdueIds,
} from "@/lib/utils/sessions";

export const DatePreset = {
  ThisWeek: "this_week",
  ThisMonth: "this_month",
  AllTime: "all_time",
  Custom: "custom",
} as const;
export type DatePreset = (typeof DatePreset)[keyof typeof DatePreset];

const DEFAULT_PAGE_SIZE = 25;

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
  page: number;
  setPage: (page: number) => void;
  totalSessions: number;
  pageSize: number;
  displayedSessions: SessionWithClientAndTherapist[];
  displayedExpectedSessions: ExpectedSession[];
  showExpectedSessions: boolean;
  overlappingIds: Set<number>;
  unconfirmedIds: Set<number>;
  overdueIds: Set<string>;
  showMine: boolean;
  allClients: ClientWithTherapist[];
  sortKey: string;
  sortDir: SortDir;
  setSort: (key: string) => void;
  expectedSortKey: string;
  expectedSortDir: SortDir;
  setExpectedSort: (key: string) => void;
  baseFilters: SessionFilters;
  reset: () => void;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { selectedTherapistId } = useSelectedTherapist();

  const [clientFilter, setClientFilterRaw] = useState("all");
  const [therapistFilter, setTherapistFilterRaw] = useState(
    () => selectedTherapistId !== null ? String(selectedTherapistId) : "all",
  );
  const [statusFilter, setStatusFilterRaw] = useState("all");
  const [datePreset, setDatePresetState] = useState<DatePreset>(DatePreset.ThisWeek);
  const initialRange = getPresetRange(DatePreset.ThisWeek);
  const [dateFromFilter, setDateFromFilterState] = useState(initialRange.from);
  const [dateToFilter, setDateToFilterState] = useState(initialRange.to);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [unconfirmedOnly, setUnconfirmedOnly] = useState(false);
  const [overlappingOnly, setOverlappingOnly] = useState(false);
  const [expectedOpen, setExpectedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("scheduled_at");
  const [sortDir, setSortDir] = useState<SortDir>(SortDir.Desc);
  const [expectedSortKey, setExpectedSortKey] = useState("scheduled_at");
  const [expectedSortDir, setExpectedSortDir] = useState<SortDir>(SortDir.Asc);

  useEffect(() => {
    setTherapistFilterRaw(selectedTherapistId !== null ? String(selectedTherapistId) : "all");
  }, [selectedTherapistId]);

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
    startTransition(() => {
      setDatePresetState(preset);
      if (preset !== DatePreset.Custom) {
        const range = getPresetRange(preset);
        setDateFromFilterState(range.from);
        setDateToFilterState(range.to);
      }
      setPage(1);
    });
  }

  function setDateFromFilter(value: string) {
    startTransition(() => {
      setDateFromFilterState(value);
      setDatePresetState(DatePreset.Custom);
      setPage(1);
    });
  }

  function setDateToFilter(value: string) {
    startTransition(() => {
      setDateToFilterState(value);
      setDatePresetState(DatePreset.Custom);
      setPage(1);
    });
  }

  function setClientFilter(value: string) {
    startTransition(() => {
      setClientFilterRaw(value);
      setPage(1);
    });
  }

  function setTherapistFilter(value: string) {
    startTransition(() => {
      setTherapistFilterRaw(value);
      setPage(1);
    });
  }

  function setStatusFilter(value: string) {
    startTransition(() => {
      setStatusFilterRaw(value);
      setPage(1);
    });
  }

  const hasBoundedRange = dateFromFilter !== "" && dateToFilter !== "";

  const baseFilters: SessionFilters = useMemo(() => ({
    ...(dateFromFilter ? { from: parse(dateFromFilter, "yyyy-MM-dd", new Date()) } : {}),
    ...(dateToFilter ? { to: endOfDay(parse(dateToFilter, "yyyy-MM-dd", new Date())) } : {}),
    ...(therapistFilter !== "all" ? { therapistIds: [Number(therapistFilter)] } : {}),
    ...(clientFilter !== "all" ? { clientId: Number(clientFilter) } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  }), [dateFromFilter, dateToFilter, therapistFilter, clientFilter, statusFilter]);

  // Range filters without status — used for overlap and unconfirmed computation
  const rangeParams = useMemo(() => ({
    ...(dateFromFilter ? { from: parse(dateFromFilter, "yyyy-MM-dd", new Date()) } : {}),
    ...(dateToFilter ? { to: endOfDay(parse(dateToFilter, "yyyy-MM-dd", new Date())) } : {}),
    ...(therapistFilter !== "all" ? { therapistIds: [Number(therapistFilter)] } : {}),
    ...(clientFilter !== "all" ? { clientId: Number(clientFilter) } : {}),
    sortKey: "scheduled_at",
    sortDir: SortDir.Asc,
  }), [dateFromFilter, dateToFilter, therapistFilter, clientFilter]);

  const listParams: SessionListParams = useMemo(() => ({
    ...baseFilters,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    sortKey,
    sortDir,
  }), [baseFilters, page, sortKey, sortDir]);

  const { data: paginatedSessions } = useSuspenseQuery({
    queryKey: queryKeys.sessions.list(listParams),
    queryFn: () => ipc.listSessions(listParams),
    refetchInterval: minutesToMilliseconds(1),
  });

  const { data: rangeSessions } = useSuspenseQuery({
    queryKey: queryKeys.sessions.range(rangeParams),
    queryFn: () =>
      hasBoundedRange ? ipc.listSessionsRange(rangeParams) : Promise.resolve([]),
    refetchInterval: minutesToMilliseconds(1),
  });

  const expectedParams = useMemo(() => (
    hasBoundedRange
      ? {
          from: parse(dateFromFilter, "yyyy-MM-dd", new Date()),
          to: endOfDay(parse(dateToFilter, "yyyy-MM-dd", new Date())),
          ...(therapistFilter !== "all" ? { therapistIds: [Number(therapistFilter)] } : {}),
          ...(clientFilter !== "all" ? { clientId: Number(clientFilter) } : {}),
          sortKey: expectedSortKey,
          sortDir: expectedSortDir,
        }
      : null
  ), [hasBoundedRange, dateFromFilter, dateToFilter, therapistFilter, clientFilter, expectedSortKey, expectedSortDir]);

  const { data: expectedSessions } = useSuspenseQuery({
    queryKey: queryKeys.sessions.expected(expectedParams),
    queryFn: () =>
      expectedParams ? ipc.listExpectedSessions(expectedParams) : Promise.resolve([]),
    refetchInterval: minutesToMilliseconds(1),
  });

  const { data: allClients } = useSuspenseQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => ipc.listAllClients(),
    refetchInterval: minutesToMilliseconds(5),
  });

  const overlappingIds = useMemo(
    () => computeOverlappingIds(rangeSessions),
    [rangeSessions],
  );

  const unconfirmedIds = useMemo(
    () => computeUnconfirmedIds(rangeSessions, new Date()),
    [rangeSessions],
  );

  const overdueIds = useMemo(
    () => computeOverdueIds(expectedSessions, new Date()),
    [expectedSessions],
  );

  const overlappingSessions = useMemo(
    () => rangeSessions.filter((s) => overlappingIds.has(s.id)),
    [rangeSessions, overlappingIds],
  );

  const unconfirmedSessions = useMemo(
    () => rangeSessions.filter((s) => unconfirmedIds.has(s.id)),
    [rangeSessions, unconfirmedIds],
  );

  const displayedSessions = useMemo(() => {
    if (unconfirmedOnly) {
      return unconfirmedSessions;
    }
    if (overlappingOnly) {
      return overlappingSessions;
    }
    return paginatedSessions.data;
  }, [paginatedSessions, unconfirmedOnly, overlappingOnly, unconfirmedSessions, overlappingSessions]);

  const totalSessions = useMemo(() => {
    if (unconfirmedOnly) {
      return unconfirmedSessions.length;
    }
    if (overlappingOnly) {
      return overlappingSessions.length;
    }
    return paginatedSessions.total;
  }, [paginatedSessions, unconfirmedOnly, overlappingOnly, unconfirmedSessions, overlappingSessions]);

  const displayedExpectedSessions = useMemo(
    () => overdueOnly
      ? expectedSessions.filter((s) => s.scheduled_at < new Date())
      : expectedSessions,
    [expectedSessions, overdueOnly],
  );

  const showExpectedSessions = hasBoundedRange
    && displayedExpectedSessions.length > 0
    && !unconfirmedOnly
    && !overlappingOnly;

  const showMine = selectedTherapistId !== null && therapistFilter === String(selectedTherapistId);

  function setSort(key: string) {
    startTransition(() => {
      if (key === sortKey) {
        setSortDir((d) => (d === SortDir.Asc ? SortDir.Desc : SortDir.Asc));
      } else {
        setSortKey(key);
        setSortDir(SortDir.Asc);
      }
      setPage(1);
    });
  }

  function setExpectedSort(key: string) {
    startTransition(() => {
      if (key === expectedSortKey) {
        setExpectedSortDir((d) => (d === SortDir.Asc ? SortDir.Desc : SortDir.Asc));
      } else {
        setExpectedSortKey(key);
        setExpectedSortDir(SortDir.Asc);
      }
    });
  }

  function reset() {
    const range = getPresetRange(DatePreset.ThisWeek);
    setClientFilterRaw("all");
    setTherapistFilterRaw(selectedTherapistId !== null ? String(selectedTherapistId) : "all");
    setStatusFilterRaw("all");
    setDatePresetState(DatePreset.ThisWeek);
    setDateFromFilterState(range.from);
    setDateToFilterState(range.to);
    setOverdueOnly(false);
    setUnconfirmedOnly(false);
    setOverlappingOnly(false);
    setExpectedOpen(false);
    setSortKey("scheduled_at");
    setSortDir(SortDir.Desc);
    setExpectedSortKey("scheduled_at");
    setExpectedSortDir(SortDir.Asc);
    setPage(1);
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
        page, setPage,
        totalSessions,
        pageSize: DEFAULT_PAGE_SIZE,
        displayedSessions,
        displayedExpectedSessions,
        showExpectedSessions,
        overlappingIds, unconfirmedIds, overdueIds,
        baseFilters,
        showMine,
        allClients,
        sortKey,
        sortDir,
        setSort,
        expectedSortKey,
        expectedSortDir,
        setExpectedSort,
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
