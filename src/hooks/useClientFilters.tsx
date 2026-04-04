import { useEffect, useMemo, useState } from "react";
import { useTherapist } from "@/context/TherapistContext";
import type { ClientWithTherapist } from "@/types/ipc";
import { sortableName } from "@/lib/utils";

export const ClientStatusFilter = {
  Open: "open",
  Closed: "closed",
  All: "all",
} as const;
export type ClientStatusFilter = (typeof ClientStatusFilter)[keyof typeof ClientStatusFilter];

export function useClientFilters(clients: ClientWithTherapist[]) {
  const { therapists, selectedTherapistId } = useTherapist();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>(ClientStatusFilter.Open);
  const [therapistFilter, setTherapistFilter] = useState(
    () => selectedTherapistId !== null ? String(selectedTherapistId) : "all",
  );

  useEffect(() => {
    setTherapistFilter(selectedTherapistId !== null ? String(selectedTherapistId) : "all");
  }, [selectedTherapistId]);

  const showMine = selectedTherapistId !== null && therapistFilter === String(selectedTherapistId);

  const sortedTherapists = useMemo(
    () => [...therapists].sort((a, b) => sortableName(a).localeCompare(sortableName(b))),
    [therapists],
  );

  const filtered = useMemo(() => {
    const searchQuery = search.trim().toLowerCase();
    return clients
      .filter((c) =>
        statusFilter === ClientStatusFilter.Open ? !c.is_closed
        : statusFilter === ClientStatusFilter.Closed ? c.is_closed
        : true
      )
      .filter((c) => therapistFilter === "all" || c.therapist_id === Number(therapistFilter))
      .filter((c) =>
        !searchQuery ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery) ||
        c.hospital_number.toLowerCase().includes(searchQuery)
      );
  }, [clients, statusFilter, therapistFilter, search]);

  function reset() {
    setSearch("");
    setStatusFilter(ClientStatusFilter.Open);
    setTherapistFilter(selectedTherapistId !== null ? String(selectedTherapistId) : "all");
  }

  return {
    search, setSearch,
    statusFilter, setStatusFilter,
    therapistFilter, setTherapistFilter,
    filtered, sortedTherapists,
    showMine, selectedTherapistId,
    reset,
  };
}
