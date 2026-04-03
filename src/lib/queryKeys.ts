export const queryKeys = {
  clients: {
    all: ["clients"] as const,
    detail: (id: number) => ["clients", id] as const,
  },
  sessions: {
    all: ["sessions"] as const,
    detail: (id: number) => ["sessions", id] as const,
  },
  therapists: {
    all: ["therapists"] as const,
    detail: (id: number) => ["therapists", id] as const,
  },
  settings: {
    dbPath: ["settings", "dbPath"] as const,
  },
};
