import type { ClientListParams } from "@shared/types/clients";
import type { SessionListParams, SessionListRangeParams, SessionListExpectedParams } from "@shared/types/sessions";
import type { TherapistListParams } from "@shared/types/therapists";

export const queryKeys = {
  clients: {
    root: ["clients"] as const,
    all: ["clients", "all"] as const,
    list: (params: ClientListParams) => ["clients", "list", params] as const,
    detail: (id: number) => ["clients", id] as const,
  },
  sessions: {
    root: ["sessions"] as const,
    list: (params: SessionListParams) => ["sessions", "list", params] as const,
    range: (params: SessionListRangeParams) => ["sessions", "range", params] as const,
    expected: (params: SessionListExpectedParams | null) => ["sessions", "expected", params] as const,
    detail: (id: number) => ["sessions", id] as const,
  },
  therapists: {
    root: ["therapists"] as const,
    all: ["therapists", "all"] as const,
    list: (params: TherapistListParams) => ["therapists", "list", params] as const,
    detail: (id: number) => ["therapists", id] as const,
  },
  settings: {
    dbPath: ["settings", "dbPath"] as const,
  },
};
