import {
  createContext,
  useContext,
  useEffect,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";
import { useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { SortDir } from "@shared/types/enums";
import type { ClientWithTherapist } from "@/types/clients";

export const ClientStatusFilter = {
  Open: "open",
  Closed: "closed",
  All: "all",
} as const;
export type ClientStatusFilter = (typeof ClientStatusFilter)[keyof typeof ClientStatusFilter];

const DEFAULT_PAGE_SIZE = 25;

interface ClientContextValue {
  clients: ClientWithTherapist[];
  totalClients: number;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: ClientStatusFilter;
  setStatusFilter: (value: ClientStatusFilter) => void;
  therapistFilter: string;
  setTherapistFilter: (value: string) => void;
  showMine: boolean;
  sortKey: string;
  sortDir: SortDir;
  setSort: (key: string) => void;
  reset: () => void;
}

const ClientCtx = createContext<ClientContextValue | null>(null);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { selectedTherapistId } = useSelectedTherapist();

  const [page, setPageState] = useState(1);
  const [search, setSearchState] = useState("");
  const [statusFilter, setStatusFilterState] = useState<ClientStatusFilter>(ClientStatusFilter.Open);
  const [therapistFilter, setTherapistFilterState] = useState(
    () => selectedTherapistId !== null ? String(selectedTherapistId) : "all",
  );
  const [sortKey, setSortKey] = useState("last_name");
  const [sortDir, setSortDir] = useState<SortDir>(SortDir.Asc);

  useEffect(() => {
    setTherapistFilterState(selectedTherapistId !== null ? String(selectedTherapistId) : "all");
  }, [selectedTherapistId]);

  const queryParams = {
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    status: statusFilter,
    therapistId: therapistFilter !== "all" ? Number(therapistFilter) : null,
    search: search.trim() || undefined,
    sortKey,
    sortDir,
  };

  const { data: result } = useSuspenseQuery({
    queryKey: queryKeys.clients.list(queryParams),
    queryFn: () => ipc.listClients(queryParams),
    refetchInterval: minutesToMilliseconds(1),
  });

  const showMine = selectedTherapistId !== null && therapistFilter === String(selectedTherapistId);

  function setPage(newPage: number) {
    startTransition(() => setPageState(newPage));
  }

  function setSearch(value: string) {
    startTransition(() => {
      setSearchState(value);
      setPageState(1);
    });
  }

  function setStatusFilter(value: ClientStatusFilter) {
    startTransition(() => {
      setStatusFilterState(value);
      setPageState(1);
    });
  }

  function setTherapistFilter(value: string) {
    startTransition(() => {
      setTherapistFilterState(value);
      setPageState(1);
    });
  }

  function setSort(key: string) {
    startTransition(() => {
      if (key === sortKey) {
        setSortDir((d) => (d === SortDir.Asc ? SortDir.Desc : SortDir.Asc));
      } else {
        setSortKey(key);
        setSortDir(SortDir.Asc);
      }
      setPageState(1);
    });
  }

  function reset() {
    startTransition(() => {
      setSearchState("");
      setStatusFilterState(ClientStatusFilter.Open);
      setTherapistFilterState(selectedTherapistId !== null ? String(selectedTherapistId) : "all");
      setSortKey("last_name");
      setSortDir(SortDir.Asc);
      setPageState(1);
    });
  }

  return (
    <ClientCtx.Provider
      value={{
        clients: result.data,
        totalClients: result.total,
        page: result.page,
        setPage,
        pageSize: result.pageSize,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        therapistFilter,
        setTherapistFilter,
        showMine,
        sortKey,
        sortDir,
        setSort,
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
