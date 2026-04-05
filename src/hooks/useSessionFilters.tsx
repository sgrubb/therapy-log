import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { useTherapist } from "@/context/TherapistContext";
import type { SessionWithRelations } from "@/types/ipc";
type SessionSortKey = "scheduled_at" | "client" | "therapist" | "session_type" | "status" | "delivery_method";

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
      from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
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

export function useSessionFilters(sessions: SessionWithRelations[]) {
  const { therapists, selectedTherapistId } = useTherapist();

  const [clientFilter, setClientFilter] = useState("all");
  const [therapistFilter, setTherapistFilter] = useState(
    () => selectedTherapistId !== null ? String(selectedTherapistId) : "all",
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [datePreset, setDatePresetState] = useState<DatePreset>(DatePreset.ThisWeek);
  const initialRange = getPresetRange(DatePreset.ThisWeek);
  const [dateFromFilter, setDateFromFilterState] = useState(initialRange.from);
  const [dateToFilter, setDateToFilterState] = useState(initialRange.to);

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
    const { clients } = sessions.reduce(
      (acc, s) => {
        if (!acc.seen.has(s.client_id)) {
          acc.seen.add(s.client_id);
          acc.clients.push({ id: s.client_id, name: `${s.client.last_name}, ${s.client.first_name}` });
        }
        return acc;
      },
      { seen: new Set<number>(), clients: [] as { id: number; name: string }[] },
    );
    return clients.sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  const filtered = useMemo(() => {
    const from = dateFromFilter ? new Date(dateFromFilter) : null;
    const to = dateToFilter ? new Date(`${dateToFilter}T23:59:59`) : null;

    return sessions
      .filter((s) => clientFilter === "all" || s.client_id === Number(clientFilter))
      .filter((s) => therapistFilter === "all" || s.therapist_id === Number(therapistFilter))
      .filter((s) => statusFilter === "all" || s.status === statusFilter)
      .filter((s) => !from || s.scheduled_at >= from)
      .filter((s) => !to || s.scheduled_at <= to);
  }, [sessions, clientFilter, therapistFilter, statusFilter, dateFromFilter, dateToFilter]);

  function reset() {
    const range = getPresetRange(DatePreset.ThisWeek);
    setClientFilter("all");
    setTherapistFilter(selectedTherapistId !== null ? String(selectedTherapistId) : "all");
    setStatusFilter("all");
    setDatePresetState(DatePreset.ThisWeek);
    setDateFromFilterState(range.from);
    setDateToFilterState(range.to);
  }

  return {
    clientFilter, setClientFilter,
    therapistFilter, setTherapistFilter,
    statusFilter, setStatusFilter,
    datePreset, setDatePreset,
    dateFromFilter, setDateFromFilter,
    dateToFilter, setDateToFilter,
    filtered, uniqueClients, sortedTherapists,
    showMine, selectedTherapistId,
    reset,
  };
}

// Re-export sort key type for use in column definitions
export type { SessionSortKey };
