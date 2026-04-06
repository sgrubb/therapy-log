import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { sortableName } from "@/lib/utils";
import type { ClientWithTherapist } from "@/types/ipc";

export const ClientStatusFilter = {
  Open: "open",
  Closed: "closed",
  All: "all",
} as const;
export type ClientStatusFilter = (typeof ClientStatusFilter)[keyof typeof ClientStatusFilter];

interface ClientContextValue {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: ClientStatusFilter;
  setStatusFilter: (value: ClientStatusFilter) => void;
  therapistFilter: string;
  setTherapistFilter: (value: string) => void;
  filtered: ClientWithTherapist[];
  sortedTherapists: { id: number; first_name: string; last_name: string }[];
  showMine: boolean;
  selectedTherapistId: number | null;
  reset: () => void;
}

const ClientCtx = createContext<ClientContextValue | null>(null);

interface ClientProviderProps {
  clients: ClientWithTherapist[];
  children: ReactNode;
}

export function ClientProvider({ clients, children }: ClientProviderProps) {
  const { therapists, selectedTherapistId } = useSelectedTherapist();

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

  return (
    <ClientCtx.Provider
      value={{
        search, setSearch,
        statusFilter, setStatusFilter,
        therapistFilter, setTherapistFilter,
        filtered, sortedTherapists,
        showMine, selectedTherapistId,
        reset,
      }}
    >
      {children}
    </ClientCtx.Provider>
  );
}

export function useClients(): ClientContextValue {
  const ctx = useContext(ClientCtx);
  if (!ctx) {
    throw new Error("useClients must be used within a ClientProvider");
  }
  return ctx;
}
