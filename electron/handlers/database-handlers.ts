import type { IpcMain } from "electron";
import type { PrismaClient } from "../../generated/prisma/client";
import { eachWeekOfInterval, format } from "date-fns";
import { therapistCreateSchema, therapistUpdateSchema, therapistListParamsSchema } from "../schemas/therapists";
import {
  clientCreateSchema,
  clientUpdateSchema,
  clientCloseSchema,
  clientReopenSchema,
  clientListParamsSchema,
} from "../schemas/clients";
import {
  sessionCreateSchema,
  sessionUpdateSchema,
  sessionListParamsSchema,
  sessionListRangeParamsSchema,
  sessionExpectedParamsSchema,
} from "../schemas/sessions";
import type { IpcApi } from "../types/ipc";
import { withErrorHandler } from "../lib/error-handler";
import type { ExpectedSession } from "@shared/types/sessions";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildOrderBy(sortKey: string, sortDir: string) {
  const parts = sortKey.split(".");
  return parts.length === 2
    ? { [parts[0]!]: { [parts[1]!]: sortDir } }
    : { [sortKey]: sortDir };
}

const SESSION_DAY_INDEX: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 0,
};

const WEEK_STARTS_ON = 1 as const; // Monday

function buildSessionWhere(filters: {
  from?: Date;
  to?: Date;
  therapistIds?: number[];
  clientId?: number;
  status?: string;
}) {
  return {
    ...(filters.from || filters.to
      ? {
          scheduled_at: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.therapistIds?.length ? { therapist_id: { in: filters.therapistIds } } : {}),
    ...(filters.clientId ? { client_id: filters.clientId } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
  };
}

// ── Handler registration ─────────────────────────────────────────────────────

export function registerDatabaseHandlers(ipcMain: IpcMain, prisma: PrismaClient) {
  // ── Therapists ───────────────────────────────────────────────────────
  ipcMain.handle(
    "therapist:list",
    (_e, rawParams: unknown): Promise<IpcApi["therapist:list"]["result"]> =>
      withErrorHandler("therapist:list", async () => {
        const { page, pageSize, sortKey, sortDir } = therapistListParamsSchema.parse(rawParams);
        const where = {};
        const total = await prisma.therapist.count({ where });
        const orderBy = buildOrderBy(sortKey, sortDir);
        const data = await prisma.therapist.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        });
        return { data, total, page, pageSize };
      }),
  );

  ipcMain.handle(
    "therapist:list-all",
    (): Promise<IpcApi["therapist:list-all"]["result"]> =>
      withErrorHandler("therapist:list-all", () =>
        prisma.therapist.findMany({ orderBy: { last_name: "asc" } }),
      ),
  );

  ipcMain.handle(
    "therapist:get",
    (_e, id: number): Promise<IpcApi["therapist:get"]["result"]> =>
      withErrorHandler("therapist:get", () =>
        prisma.therapist.findUniqueOrThrow({ where: { id } }),
      ),
  );

  ipcMain.handle(
    "therapist:create",
    (_e, rawData: unknown): Promise<IpcApi["therapist:create"]["result"]> =>
      withErrorHandler("therapist:create", async () => {
        const data = therapistCreateSchema.parse(rawData);
        return prisma.therapist.create({ data });
      }),
  );

  ipcMain.handle(
    "therapist:update",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["therapist:update"]["result"]> =>
      withErrorHandler("therapist:update", async () => {
        const { id, data: rawData } = rawInput;
        const { updated_at: clientUpdatedAt, ...updateData } = therapistUpdateSchema.parse(rawData);
        return prisma.$transaction(async (tx) => {
          const existing = await tx.therapist.findUniqueOrThrow({ where: { id } });
          if (existing.updated_at.getTime() !== clientUpdatedAt.getTime()) {
            throw new Error("CONFLICT");
          }
          return tx.therapist.update({ where: { id }, data: updateData });
        });
      }),
  );

  // ── Clients ──────────────────────────────────────────────────────────
  ipcMain.handle(
    "client:list",
    (_e, rawParams: unknown): Promise<IpcApi["client:list"]["result"]> =>
      withErrorHandler("client:list", async () => {
        const {
          page,
          pageSize,
          status,
          therapistId,
          search,
          sortKey,
          sortDir,
        } = clientListParamsSchema.parse(rawParams);
        const where = {
          ...(status === "open" ? { closed_date: null } : {}),
          ...(status === "closed" ? { closed_date: { not: null } } : {}),
          ...(therapistId != null ? { therapist_id: therapistId } : {}),
          ...(search
            ? {
                OR: [
                  { first_name: { contains: search } },
                  { last_name: { contains: search } },
                  { hospital_number: { contains: search } },
                ],
              }
            : {}),
        };
        const total = await prisma.client.count({ where });
        const orderBy = buildOrderBy(sortKey, sortDir);
        const data = await prisma.client.findMany({
          where,
          include: { therapist: true },
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        });
        return { data, total, page, pageSize };
      }),
  );

  ipcMain.handle(
    "client:list-all",
    (): Promise<IpcApi["client:list-all"]["result"]> =>
      withErrorHandler("client:list-all", () =>
        prisma.client.findMany({
          include: { therapist: true },
          orderBy: { last_name: "asc" },
        }),
      ),
  );

  ipcMain.handle(
    "client:get",
    (_e, id: number): Promise<IpcApi["client:get"]["result"]> =>
      withErrorHandler("client:get", () =>
        prisma.client.findUniqueOrThrow({ where: { id }, include: { therapist: true } }),
      ),
  );

  ipcMain.handle(
    "client:create",
    (_e, rawData: unknown): Promise<IpcApi["client:create"]["result"]> =>
      withErrorHandler("client:create", async () => {
        const data = clientCreateSchema.parse(rawData);
        return prisma.client.create({ data });
      }),
  );

  ipcMain.handle(
    "client:update",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["client:update"]["result"]> =>
      withErrorHandler("client:update", async () => {
        const { id, data: rawData } = rawInput;
        const { updated_at: clientUpdatedAt, ...updateData } = clientUpdateSchema.parse(rawData);
        return prisma.$transaction(async (tx) => {
          const existing = await tx.client.findUniqueOrThrow({ where: { id } });
          if (existing.updated_at.getTime() !== clientUpdatedAt.getTime()) {
            throw new Error("CONFLICT");
          }
          return tx.client.update({ where: { id }, data: updateData, include: { therapist: true } });
        });
      }),
  );

  ipcMain.handle(
    "client:close",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["client:close"]["result"]> =>
      withErrorHandler("client:close", async () => {
        const { id, data: rawData } = rawInput;
        const data = clientCloseSchema.parse(rawData);
        return prisma.client.update({
          where: { id },
          data: { ...data },
          include: { therapist: true },
        });
      }),
  );

  ipcMain.handle(
    "client:reopen",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["client:reopen"]["result"]> =>
      withErrorHandler("client:reopen", async () => {
        const { id, data: rawData } = rawInput;
        const data = clientReopenSchema.parse(rawData);
        return prisma.client.update({
          where: { id },
          data: { ...data, closed_date: null, post_score: null, outcome: null },
          include: { therapist: true },
        });
      }),
  );

  // ── Sessions ─────────────────────────────────────────────────────────

  ipcMain.handle(
    "session:list",
    (_e, rawParams: unknown): Promise<IpcApi["session:list"]["result"]> =>
      withErrorHandler("session:list", async () => {
        const { page, pageSize, sortKey, sortDir, ...filters } = sessionListParamsSchema.parse(rawParams);
        const where = buildSessionWhere(filters);
        const total = await prisma.session.count({ where });
        const orderBy = buildOrderBy(sortKey, sortDir);
        const data = await prisma.session.findMany({
          where,
          include: { client: true, therapist: true },
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        });
        return { data, total, page, pageSize };
      }),
  );

  ipcMain.handle(
    "session:list-range",
    (_e, rawFilters: unknown): Promise<IpcApi["session:list-range"]["result"]> =>
      withErrorHandler("session:list-range", async () => {
        const { sortKey = "scheduled_at", sortDir = "asc", ...filters } =
          sessionListRangeParamsSchema.parse(rawFilters);
        return prisma.session.findMany({
          where: buildSessionWhere(filters),
          include: { client: true, therapist: true },
          orderBy: buildOrderBy(sortKey, sortDir),
        });
      }),
  );

  ipcMain.handle(
    "session:list-expected",
    (_e, rawParams: unknown): Promise<IpcApi["session:list-expected"]["result"]> =>
      withErrorHandler("session:list-expected", async () => {
        const { from, to, therapistIds, clientId, sortKey, sortDir } =
          sessionExpectedParamsSchema.parse(rawParams);

        const clients = await prisma.client.findMany({
          where: {
            closed_date: null,
            session_day: { not: null },
            session_time: { not: null },
            ...(therapistIds?.length ? { therapist_id: { in: therapistIds } } : {}),
            ...(clientId ? { id: clientId } : {}),
          },
          include: { therapist: true },
        });

        const clientIds = clients.map((c) => c.id);
        const sessions = await prisma.session.findMany({
          where: {
            client_id: { in: clientIds },
            scheduled_at: { gte: from, lte: to },
          },
          select: { client_id: true, scheduled_at: true },
        });

        const coveredWeeks = new Set(
          sessions.map((s) => {
            const d = new Date(s.scheduled_at);
            const daysToMon = (d.getDay() + 6) % 7;
            const mon = new Date(d);
            mon.setDate(d.getDate() - daysToMon);
            return `${s.client_id}-${format(mon, "yyyy-MM-dd")}`;
          }),
        );

        const weekStarts = eachWeekOfInterval(
          { start: from, end: to },
          { weekStartsOn: WEEK_STARTS_ON },
        );

        const expected: ExpectedSession[] = weekStarts.flatMap((weekDate) => {
          const weekKey = format(weekDate, "yyyy-MM-dd");
          return clients.flatMap((client): ExpectedSession[] => {
            if (coveredWeeks.has(`${client.id}-${weekKey}`)) {
              return [];
            }
            const dayIdx = SESSION_DAY_INDEX[client.session_day!];
            if (dayIdx === undefined) {
              return [];
            }
            const daysFromMonday = dayIdx === 0 ? 6 : dayIdx - 1;
            const sessionDay = new Date(weekDate);
            sessionDay.setDate(weekDate.getDate() + daysFromMonday);

            const effectiveStart = client.start_date > from ? client.start_date : from;
            if (sessionDay < effectiveStart || sessionDay > to) {
              return [];
            }

            const [hStr, mStr] = client.session_time!.split(":");
            sessionDay.setHours(Number(hStr ?? 0), Number(mStr ?? 0), 0, 0);

            return [{
              id: `expected-${client.id}-${weekKey}`,
              client_id: client.id,
              therapist_id: client.therapist_id,
              scheduled_at: new Date(sessionDay),
              duration: client.session_duration ?? 60,
              client: {
                id: client.id,
                first_name: client.first_name,
                last_name: client.last_name,
              },
              therapist: {
                id: client.therapist.id,
                first_name: client.therapist.first_name,
                last_name: client.therapist.last_name,
              },
            }];
          });
        });

        const dir = sortDir === "asc" ? 1 : -1;
        expected.sort((a, b) => {
          switch (sortKey) {
            case "scheduled_at":
              return dir * (a.scheduled_at.getTime() - b.scheduled_at.getTime());
            case "client.last_name":
              return dir * a.client.last_name.localeCompare(b.client.last_name);
            case "therapist.last_name":
              return dir * a.therapist.last_name.localeCompare(b.therapist.last_name);
            default:
              return 0;
          }
        });

        return expected;
      }),
  );

  ipcMain.handle(
    "session:get",
    (_e, id: number): Promise<IpcApi["session:get"]["result"]> =>
      withErrorHandler("session:get", () =>
        prisma.session.findUniqueOrThrow({
          where: { id },
          include: { client: true, therapist: true },
        }),
      ),
  );

  ipcMain.handle(
    "session:create",
    (_e, rawData: unknown): Promise<IpcApi["session:create"]["result"]> =>
      withErrorHandler("session:create", async () => {
        const data = sessionCreateSchema.parse(rawData);
        return prisma.session.create({ data });
      }),
  );

  ipcMain.handle(
    "session:update",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["session:update"]["result"]> =>
      withErrorHandler("session:update", async () => {
        const { id, data: rawData } = rawInput;
        const { updated_at: clientUpdatedAt, ...updateData } = sessionUpdateSchema.parse(rawData);
        return prisma.$transaction(async (tx) => {
          const existing = await tx.session.findUniqueOrThrow({ where: { id } });
          if (existing.updated_at.getTime() !== clientUpdatedAt.getTime()) {
            throw new Error("CONFLICT");
          }
          return tx.session.update({ where: { id }, data: updateData });
        });
      }),
  );
}
