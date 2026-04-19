import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/query-keys";
import type { Therapist } from "@shared/types/therapists";

interface SelectedTherapistContextValue {
  therapists: Therapist[];
  activeTherapists: Therapist[];
  selectedTherapistId: number | null;
  setSelectedTherapistId: (id: number | null) => void;
}

const SelectedTherapistCtx = createContext<SelectedTherapistContextValue | null>(null);

const STORAGE_KEY = "selectedTherapistId";

export function SelectedTherapistProvider({ children }: { children: ReactNode }) {
  const { data: therapists } = useSuspenseQuery({
    queryKey: queryKeys.therapists.all,
    queryFn: () => ipc.listAllTherapists(false),
    refetchInterval: minutesToMilliseconds(1),
  });

  const activeTherapists = useMemo(
    () => therapists.filter((t) => t.deactivated_date === null),
    [therapists],
  );

  const [selectedTherapistId, setSelectedTherapistIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  useEffect(() => {
    if (selectedTherapistId === null) {
      return;
    }
    const selected = therapists.find((t) => t.id === selectedTherapistId);
    if (selected && selected.deactivated_date !== null) {
      setSelectedTherapistIdState(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [therapists, selectedTherapistId]);

  function setSelectedTherapistId(id: number | null) {
    setSelectedTherapistIdState(id);
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  }

  return (
    <SelectedTherapistCtx.Provider
      value={{ therapists, activeTherapists, selectedTherapistId, setSelectedTherapistId }}
    >
      {children}
    </SelectedTherapistCtx.Provider>
  );
}

export function useSelectedTherapist(): SelectedTherapistContextValue {
  const ctx = useContext(SelectedTherapistCtx);
  if (!ctx) {
    throw new Error("useSelectedTherapist must be used within a SelectedTherapistProvider");
  }
  return ctx;
}
