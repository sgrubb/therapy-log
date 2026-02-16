import type {
  Therapist,
  Client,
  Session,
  Prisma,
} from "../generated/prisma/client";

// ── Query / Mutation payloads ──────────────────────────────────────────

export type IpcApi = {
  // Therapists
  "therapist:list": { args: void; result: Therapist[] };
  "therapist:get": { args: number; result: Therapist | null };
  "therapist:create": {
    args: Prisma.TherapistCreateInput;
    result: Therapist;
  };
  "therapist:update": {
    args: { id: number; data: Prisma.TherapistUpdateInput };
    result: Therapist;
  };

  // Clients
  "client:list": { args: void; result: Client[] };
  "client:get": { args: number; result: Client | null };
  "client:create": {
    args: Prisma.ClientUncheckedCreateInput;
    result: Client;
  };
  "client:update": {
    args: { id: number; data: Prisma.ClientUncheckedUpdateInput };
    result: Client;
  };

  // Sessions
  "session:list": { args: void; result: Session[] };
  "session:get": { args: number; result: Session | null };
  "session:create": {
    args: Prisma.SessionUncheckedCreateInput;
    result: Session;
  };
  "session:update": {
    args: { id: number; data: Prisma.SessionUncheckedUpdateInput };
    result: Session;
  };
};

export type IpcChannel = keyof IpcApi;
