import type { IpcMain } from "electron";
import type { PrismaClient } from "../../generated/prisma/client";
import { addDays, eachWeekOfInterval, endOfWeek, format, set, startOfWeek } from "date-fns";
import {
  therapistCreateSchema,
  therapistUpdateSchema,
  therapistDeactivateSchema,
  therapistReactivateSchema,
  therapistListParamsSchema,
  therapistListAllParamsSchema,
} from "@shared/schemas/therapists";
import {
  clientCreateSchema,
  clientUpdateSchema,
  clientCloseSchema,
  clientReopenSchema,
  clientListParamsSchema,
  clientListAllParamsSchema,
} from "@shared/schemas/clients";
import {
  sessionCreateSchema,
  sessionUpdateSchema,
  sessionListParamsSchema,
  sessionListRangeParamsSchema,
  sessionListExpectedParamsSchema,
} from "@shared/schemas/sessions";
import type { IpcApi } from "../types/ipc";
import { withErrorHandler } from "../lib/error-handler";
import { IpcErrorCode } from "@shared/types/ipc";
import type { ExpectedSession } from "@shared/types/sessions";
import { SortDir } from "@shared/types/enums";
import { buildTherapistWhere, buildClientWhere, buildSessionWhere } from "../lib/where-builders";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildOrderBy(sortKey: string, sortDir: SortDir) {
  const parts = sortKey.split(".");
  return parts.length === 2
    ? { [parts[0]!]: { [parts[1]!]: sortDir } }
    : { [sortKey]: sortDir };
}

const SESSION_DAY_OFFSET: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

const WEEK_STARTS_ON = 1 as const; // Monday

// ── Handler registration ─────────────────────────────────────────────────────

export function registerDatabaseHandlers(ipcMain: IpcMain, prisma: PrismaClient) {
  // ── Therapists ───────────────────────────────────────────────────────
  ipcMain.handle(
    "therapist:list",
    (_e, rawParams: unknown): Promise<IpcApi["therapist:list"]["result"]> =>
      withErrorHandler("therapist:list", async () => {
        const { page, pageSize, sortKey, sortDir, status } = therapistListParamsSchema.parse(rawParams);
        const where = buildTherapistWhere(status);
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
    (_e, rawParams: unknown): Promise<IpcApi["therapist:list-all"]["result"]> =>
      withErrorHandler("therapist:list-all", () => {
        const { activeOnly } = therapistListAllParamsSchema.parse(rawParams ?? {});
        return prisma.therapist.findMany({
          ...(activeOnly ? { where: { deactivated_date: null } } : {}),
          orderBy: { last_name: SortDir.Asc },
        });
      }),
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
        const { updated_at: therapistUpdatedAt, ...updateData } = therapistUpdateSchema.parse(rawData);
        return prisma.$transaction(async (tx) => {
          const existing = await tx.therapist.findUniqueOrThrow({ where: { id } });
          if (existing.updated_at.getTime() !== therapistUpdatedAt.getTime()) {
            throw new Error(IpcErrorCode.Conflict);
          }
          return tx.therapist.update({ where: { id }, data: updateData });
        });
      }),
  );

  ipcMain.handle(
    "therapist:deactivate",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["therapist:deactivate"]["result"]> =>
      withErrorHandler("therapist:deactivate", async () => {
        const { id, data: rawData } = rawInput;
        const { updated_at: therapistUpdatedAt, client_reassignments } = therapistDeactivateSchema.parse(rawData);
        return prisma.$transaction(async (tx) => {
          const existing = await tx.therapist.findUniqueOrThrow({ where: { id } });
          if (existing.updated_at.getTime() !== therapistUpdatedAt.getTime()) {
            throw new Error(IpcErrorCode.Conflict);
          }
          const openClients = await tx.client.findMany({
            where: { therapist_id: id, closed_date: null },
            select: { id: true },
          });
          const reassignmentMap = new Map(client_reassignments.map((r) => [r.client_id, r.new_therapist_id]));
          if (openClients.some((c) => !reassignmentMap.has(c.id))) {
            throw new Error(IpcErrorCode.Validation);
          }
          await Promise.all(
            client_reassignments.map((r) =>
              tx.client.update({ where: { id: r.client_id }, data: { therapist_id: r.new_therapist_id } }),
            ),
          );
          return tx.therapist.update({ where: { id }, data: { deactivated_date: new Date() } });
        });
      }),
  );

  ipcMain.handle(
    "therapist:reactivate",
    (_e, rawInput: { id: number; data: unknown }): Promise<IpcApi["therapist:reactivate"]["result"]> =>
      withErrorHandler("therapist:reactivate", async () => {
        const { id, data: rawData } = rawInput;
        const { updated_at: therapistUpdatedAt } = therapistReactivateSchema.parse(rawData);
        return prisma.$transaction(async (tx) => {
          const existing = await tx.therapist.findUniqueOrThrow({ where: { id } });
          if (existing.updated_at.getTime() !== therapistUpdatedAt.getTime()) {
            throw new Error(IpcErrorCode.Conflict);
          }
          return tx.therapist.update({ where: { id }, data: { deactivated_date: null } });
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
        const where = buildClientWhere({ status, therapistId, search });
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
    (_e, rawParams: unknown): Promise<IpcApi["client:list-all"]["result"]> =>
      withErrorHandler("client:list-all", () => {
        const { therapistId, openOnly } = clientListAllParamsSchema.parse(rawParams ?? {});
        return prisma.client.findMany({
          where: {
            ...(therapistId != null ? { therapist_id: therapistId } : {}),
            ...((openOnly ?? false) ? { closed_date: null } : {}),
          },
          include: { therapist: true },
          orderBy: { last_name: SortDir.Asc },
        });
      }),
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
            throw new Error(IpcErrorCode.Conflict);
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
        const { sortKey, sortDir, ...filters } = sessionListRangeParamsSchema.parse(rawFilters);
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
          sessionListExpectedParamsSchema.parse(rawParams);

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
            scheduled_at: {
              gte: startOfWeek(from, { weekStartsOn: WEEK_STARTS_ON }),
              lte: endOfWeek(to, { weekStartsOn: WEEK_STARTS_ON }),
            },
          },
          select: { client_id: true, scheduled_at: true },
        });

        const coveredWeeks = new Set(
          sessions.map((s) =>
            `${s.client_id}-${format(startOfWeek(s.scheduled_at, { weekStartsOn: WEEK_STARTS_ON }), "yyyy-MM-dd")}`,
          ),
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
            const offset = SESSION_DAY_OFFSET[client.session_day!];
            if (offset === undefined) {
              return [];
            }
            const sessionDay = addDays(weekDate, offset);

            const effectiveStart = client.start_date > from ? client.start_date : from;
            if (sessionDay < effectiveStart || sessionDay > to) {
              return [];
            }

            const [hStr, mStr] = client.session_time!.split(":");
            const scheduledAt = set(sessionDay, {
              hours: Number(hStr ?? 0),
              minutes: Number(mStr ?? 0),
              seconds: 0,
              milliseconds: 0,
            });

            return [{
              id: `expected-${client.id}-${weekKey}`,
              client_id: client.id,
              therapist_id: client.therapist_id,
              scheduled_at: scheduledAt,
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

        const dir = sortDir === SortDir.Asc ? 1 : -1;
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
        const { updated_at: sessionUpdatedAt, ...updateData } = sessionUpdateSchema.parse(rawData);
        return prisma.$transaction(async (tx) => {
          const existing = await tx.session.findUniqueOrThrow({ where: { id } });
          if (existing.updated_at.getTime() !== sessionUpdatedAt.getTime()) {
            throw new Error(IpcErrorCode.Conflict);
          }
          return tx.session.update({ where: { id }, data: updateData });
        });
      }),
  );
}
