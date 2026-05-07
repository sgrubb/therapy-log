import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/query-keys";
import type { Therapist } from "@shared/types/therapists";
import { therapistId } from "@shared/types/brands";
import type { TherapistId } from "@shared/types/brands";

interface SelectedTherapistContextValue {
  therapists: Therapist[];
  activeTherapists: Therapist[];
  selectedTherapistId: TherapistId | null;
  setSelectedTherapistId: (id: TherapistId | null) => void;
}

const SelectedTherapistCtx = createContext<SelectedTherapistContextValue | null>(null);

const STORAGE_KEY = "selectedTherapistId";

export function SelectedTherapistProvider({ children }: { children: ReactNode }) {
  const { data: therapists } = useSuspenseQuery({
    queryKey: queryKeys.therapists.all,
    queryFn: () => ipc.listAllTherapists(),
    refetchInterval: minutesToMilliseconds(1),
  });

  const activeTherapists = useMemo(
    () => therapists.filter((t) => t.deactivated_date === null),
    [therapists],
  );

  const [selectedTherapistId, setSelectedTherapistIdState] = useState<TherapistId | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? therapistId(Number(stored)) : null;
  });

  const setSelectedTherapistId = useCallback((id: TherapistId | null) => {
    setSelectedTherapistIdState(id);
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  }, []);

  // On first mount, if nothing is in localStorage, check the config for an initial selection
  // written by the setup wizard (which runs in a separate window with its own localStorage).
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== null) {
      return;
    }
    ipc.getInitialTherapistId().then((id) => {
      if (id !== null) {
        setSelectedTherapistId(therapistId(id));
      }
    });
  }, [setSelectedTherapistId]);

  useEffect(() => {
    if (selectedTherapistId === null) {
      return;
    }
    const selected = therapists.find((t) => t.id === selectedTherapistId);
    if (selected && selected.deactivated_date !== null) {
      setSelectedTherapistId(null);
    }
  }, [therapists, selectedTherapistId, setSelectedTherapistId]);

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
