import { useMemo, useState } from "react";
import { useTherapist } from "@/context/TherapistContext";
import type { ClientWithTherapist } from "@/types/ipc";

type ClientSortKey = "name" | "hospital_number" | "therapist" | "session_day" | "status";

export function useClientFilters(clients: ClientWithTherapist[]) {
  const { therapists, selectedTherapistId } = useTherapist();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"open" | "closed" | "all">("open");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [sortKey, setSortKey] = useState<ClientSortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const showMine = selectedTherapistId !== null && therapistFilter === String(selectedTherapistId);

  function handleSort(key: ClientSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: ClientSortKey) {
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

  const sorted = useMemo(() => {
    const searchQuery = search.trim().toLowerCase();
    return clients
      .filter((c) =>
        statusFilter === "open" ? !c.is_closed
        : statusFilter === "closed" ? c.is_closed
        : true
      )
      .filter((c) => therapistFilter === "all" || c.therapist_id === Number(therapistFilter))
      .filter((c) =>
        !searchQuery ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery) ||
        c.hospital_number.toLowerCase().includes(searchQuery)
      )
      .sort((a, b) => {
        const cmp = (() => {
          switch (sortKey) {
            case "name": return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
            case "hospital_number": return a.hospital_number.localeCompare(b.hospital_number);
            case "therapist": return `${a.therapist.last_name} ${a.therapist.first_name}`.localeCompare(`${b.therapist.last_name} ${b.therapist.first_name}`);
            case "session_day": return (a.session_day ?? "").localeCompare(b.session_day ?? "");
            case "status": return Number(a.is_closed) - Number(b.is_closed);
          }
        })();
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [clients, statusFilter, therapistFilter, search, sortKey, sortDir]);

  return {
    search, setSearch,
    statusFilter, setStatusFilter,
    therapistFilter, setTherapistFilter,
    handleSort, sortIndicator,
    sorted, sortedTherapists,
    showMine, selectedTherapistId,
  };
}
