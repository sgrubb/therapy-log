import { useEffect, useMemo, useState } from "react";
import { useTherapist } from "@/context/TherapistContext";
import type { SessionWithRelations } from "@/types/ipc";
import { SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES } from "@/types/enums";
import { useSortableTable, SortDir } from "@/hooks/useSortableTable";
import { sortableName } from "@/lib/utils";

type SessionSortKey = "scheduled_at" | "client" | "therapist" | "session_type" | "status" | "delivery_method";

export const DatePreset = {
  ThisWeek: "this_week",
  ThisMonth: "this_month",
  AllTime: "all_time",
  Custom: "custom",
} as const;
export type DatePreset = (typeof DatePreset)[keyof typeof DatePreset];

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0] ?? "";
}

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  if (preset === DatePreset.ThisWeek) {
    const day = now.getDay();
    const daysToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { from: toDateString(monday), to: toDateString(sunday) };
  }
  if (preset === DatePreset.ThisMonth) {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toDateString(firstDay), to: toDateString(lastDay) };
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
    const range = getPresetRange(preset);
    setDatePresetState(preset);
    setDateFromFilterState(range.from);
    setDateToFilterState(range.to);
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

  const { sortKey, sortDir, handleSort, sortIndicator } = useSortableTable<SessionSortKey>("scheduled_at", SortDir.Desc);

  const showMine = selectedTherapistId !== null && therapistFilter === String(selectedTherapistId);

  const sortedTherapists = useMemo(
    () => [...therapists].sort((a, b) => sortableName(a).localeCompare(sortableName(b))),
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

    return [...sessions]
      .filter((s) => clientFilter === "all" || s.client_id === Number(clientFilter))
      .filter((s) => therapistFilter === "all" || s.therapist_id === Number(therapistFilter))
      .filter((s) => statusFilter === "all" || s.status === statusFilter)
      .filter((s) => !from || s.scheduled_at >= from)
      .filter((s) => !to || s.scheduled_at <= to)
      .sort((a, b) => {
        const cmp = (() => {
          switch (sortKey) {
            case "scheduled_at":
              return a.scheduled_at.getTime() - b.scheduled_at.getTime();
            case "client":
              return sortableName(a.client).localeCompare(sortableName(b.client));
            case "therapist":
              return sortableName(a.therapist).localeCompare(sortableName(b.therapist));
            case "session_type":
              return (SESSION_TYPE_NAMES[a.session_type] ?? a.session_type)
                .localeCompare(SESSION_TYPE_NAMES[b.session_type] ?? b.session_type);
            case "status":
              return a.status.localeCompare(b.status);
            case "delivery_method":
              return (DELIVERY_METHOD_NAMES[a.delivery_method] ?? a.delivery_method)
                .localeCompare(DELIVERY_METHOD_NAMES[b.delivery_method] ?? b.delivery_method);
          }
        })();
        return sortDir === SortDir.Asc ? cmp : -cmp;
      });
  }, [sessions, clientFilter, therapistFilter, statusFilter, dateFromFilter, dateToFilter, sortKey, sortDir]);

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
    handleSort, sortIndicator,
    filtered, uniqueClients, sortedTherapists,
    showMine, selectedTherapistId,
    reset,
  };
}
