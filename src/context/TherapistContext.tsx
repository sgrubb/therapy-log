import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Therapist } from "../../generated/prisma/client";

interface TherapistContextValue {
  therapists: Therapist[];
  selectedTherapistId: number | null;
  setSelectedTherapistId: (id: number | null) => void;
}

const TherapistContext = createContext<TherapistContextValue | null>(null);

const STORAGE_KEY = "selectedTherapistId";

export function TherapistProvider({ children }: { children: ReactNode }) {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [selectedTherapistId, setSelectedTherapistIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  useEffect(() => {
    async function fetchTherapists() {
      try {
        const list = await window.electronAPI.invoke("therapist:list");
        setTherapists(list);
      } catch (err) {
        console.error("Failed to fetch therapists:", err);
      }
    }
    fetchTherapists();
  }, []);

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
