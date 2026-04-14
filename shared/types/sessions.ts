// ── Session filter + pagination types ─────────────────────────────────────
// Shared between renderer (src/) and electron main process.

import { SortDir } from "@shared/types/enums";

export interface SessionFilters {
  from?: Date;
  to?: Date;
  therapistIds?: number[];
  clientId?: number;
  status?: string;
}

export interface SessionListParams extends SessionFilters {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: SortDir;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── ExpectedSession ────────────────────────────────────────────────────────

export interface ExpectedSession {
  id: string;
  client_id: number;
  therapist_id: number;
  scheduled_at: Date;
  duration: number;
  client: { id: number; first_name: string; last_name: string };
  therapist: { id: number; first_name: string; last_name: string };
}

// ── SessionListRangeParams ─────────────────────────────────────────────────

export interface SessionListRangeParams extends SessionFilters {
  sortKey?: string;
  sortDir?: SortDir;
}
