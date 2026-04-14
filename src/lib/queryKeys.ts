import { type SortDir } from "@shared/types/enums";
import type { SessionListParams, SessionListRangeParams } from "@shared/types/sessions";

export const queryKeys = {
  clients: {
    root: ["clients"] as const,
    all: ["clients", "all"] as const,
    list: (params: {
      page: number;
      pageSize: number;
      status?: string;
      therapistId?: number | null;
      search?: string;
      sortKey: string;
      sortDir: SortDir;
    }) => ["clients", "list", params] as const,
    detail: (id: number) => ["clients", id] as const,
  },
  sessions: {
    root: ["sessions"] as const,
    list: (params: SessionListParams) => ["sessions", "list", params] as const,
    range: (params: SessionListRangeParams) => ["sessions", "range", params] as const,
    expected: (params: {
      from: Date;
      to: Date;
      therapistIds?: number[];
      clientId?: number;
      sortKey: string;
      sortDir: SortDir;
    } | null) => ["sessions", "expected", params] as const,
    detail: (id: number) => ["sessions", id] as const,
  },
  therapists: {
    root: ["therapists"] as const,
    all: ["therapists", "all"] as const,
    list: (params: { page: number; pageSize: number; sortKey: string; sortDir: SortDir }) => ["therapists", "list", params] as const,
    detail: (id: number) => ["therapists", id] as const,
  },
  settings: {
    dbPath: ["settings", "dbPath"] as const,
  },
};
