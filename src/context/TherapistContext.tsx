import {
  createContext,
  useContext,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { SortDir } from "@shared/types/enums";
import type { Therapist } from "@/types/therapists";

const DEFAULT_PAGE_SIZE = 25;

interface TherapistContextValue {
  therapists: Therapist[];
  totalTherapists: number;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  sortKey: string;
  sortDir: SortDir;
  setSort: (key: string) => void;
}

const TherapistCtx = createContext<TherapistContextValue | null>(null);

export function TherapistProvider({ children }: { children: ReactNode }) {
  const [page, setPageState] = useState(1);
  const [sortKey, setSortKey] = useState("last_name");
  const [sortDir, setSortDir] = useState<SortDir>(SortDir.Asc);

  const params = { page, pageSize: DEFAULT_PAGE_SIZE, sortKey, sortDir };

  const { data: result } = useSuspenseQuery({
    queryKey: queryKeys.therapists.list(params),
    queryFn: () => ipc.listTherapists(params),
    refetchInterval: minutesToMilliseconds(1),
  });

  function setPage(newPage: number) {
    startTransition(() => setPageState(newPage));
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

  return (
    <TherapistCtx.Provider
      value={{
        therapists: result.data,
        totalTherapists: result.total,
        page: result.page,
        setPage,
        pageSize: result.pageSize,
        sortKey,
        sortDir,
        setSort,
      }}
    >
      {children}
    </TherapistCtx.Provider>
  );
}

export function useTherapists(): TherapistContextValue {
  const ctx = useContext(TherapistCtx);
  if (!ctx) {
    throw new Error("useTherapists must be used within a TherapistProvider");
  }
  return ctx;
}
