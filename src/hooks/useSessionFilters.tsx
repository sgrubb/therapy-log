import { useMemo, useState } from "react";
import { useTherapist } from "@/context/TherapistContext";
import type { SessionWithRelations } from "@/types/ipc";
import { SESSION_TYPE_NAMES, DELIVERY_METHOD_NAMES } from "@/types/enums";

type SessionSortKey = "scheduled_at" | "client" | "therapist" | "session_type" | "status" | "delivery_method";

export function useSessionFilters(sessions: SessionWithRelations[]) {
  const { therapists, selectedTherapistId } = useTherapist();

  const [clientFilter, setClientFilter] = useState("all");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [sortKey, setSortKey] = useState<SessionSortKey>("scheduled_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const showMine = selectedTherapistId !== null && therapistFilter === String(selectedTherapistId);

  function handleSort(key: SessionSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: SessionSortKey) {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const sortedTherapists = useMemo(
    () =>
      [...therapists].sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`),
      ),
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
            case "scheduled_at": return a.scheduled_at.getTime() - b.scheduled_at.getTime();
            case "client": return `${a.client.last_name} ${a.client.first_name}`.localeCompare(`${b.client.last_name} ${b.client.first_name}`);
            case "therapist": return `${a.therapist.last_name} ${a.therapist.first_name}`.localeCompare(`${b.therapist.last_name} ${b.therapist.first_name}`);
            case "session_type": return (SESSION_TYPE_NAMES[a.session_type] ?? a.session_type).localeCompare(SESSION_TYPE_NAMES[b.session_type] ?? b.session_type);
            case "status": return a.status.localeCompare(b.status);
            case "delivery_method": return (DELIVERY_METHOD_NAMES[a.delivery_method] ?? a.delivery_method).localeCompare(DELIVERY_METHOD_NAMES[b.delivery_method] ?? b.delivery_method);
          }
        })();
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [sessions, clientFilter, therapistFilter, statusFilter, dateFromFilter, dateToFilter, sortKey, sortDir]);

  return {
    clientFilter, setClientFilter,
    therapistFilter, setTherapistFilter,
    statusFilter, setStatusFilter,
    dateFromFilter, setDateFromFilter,
    dateToFilter, setDateToFilter,
    handleSort, sortIndicator,
    filtered, uniqueClients, sortedTherapists,
    showMine, selectedTherapistId,
  };
}
