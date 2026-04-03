import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import type { Therapist } from "@/types/ipc";

interface TherapistContextValue {
  therapists: Therapist[];
  selectedTherapistId: number | null;
  setSelectedTherapistId: (id: number | null) => void;
}

const TherapistContext = createContext<TherapistContextValue | null>(null);

const STORAGE_KEY = "selectedTherapistId";

export function TherapistProvider({ children }: { children: ReactNode }) {
  const { data: therapists } = useSuspenseQuery({
    queryKey: queryKeys.therapists.all,
    queryFn: () => ipc.listTherapists(),
  });

  const [selectedTherapistId, setSelectedTherapistIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  function setSelectedTherapistId(id: number | null) {
    setSelectedTherapistIdState(id);
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  }

  return (
    <TherapistContext.Provider
      value={{ therapists, selectedTherapistId, setSelectedTherapistId }}
    >
      {children}
    </TherapistContext.Provider>
  );
}

export function useTherapist(): TherapistContextValue {
  const ctx = useContext(TherapistContext);
  if (!ctx) {
    throw new Error("useTherapist must be used within a TherapistProvider");
  }
  return ctx;
}
