import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import log from "./logger";
import type { IpcError, IpcResponse } from "../types/ipc";
import { IpcErrorCode } from "@shared/types/ipc";

function classifyError(err: unknown): IpcError {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return { code: IpcErrorCode.UniqueConstraint, message: "A record with this value already exists." };
    }
    if (err.code === "P2003") {
      return { code: IpcErrorCode.ForeignKey, message: "A related record could not be found." };
    }
    if (err.code === "P2025") {
      return { code: IpcErrorCode.NotFound, message: "The requested record was not found." };
    }
  }

  if (err instanceof ZodError) {
    return { code: IpcErrorCode.Validation, message: "The provided data is invalid." };
  }

  if (err instanceof Error && err.message === IpcErrorCode.Validation) {
    return { code: IpcErrorCode.Validation, message: "The provided data is invalid." };
  }

  if (err instanceof Error && err.message === IpcErrorCode.Conflict) {
    return { code: IpcErrorCode.Conflict, message: "This record was modified by someone else." };
  }

  return { code: IpcErrorCode.Unknown, message: "An unexpected error occurred." };
}

export async function withErrorHandler<T>(
  channel: string,
  handler: () => Promise<T>,
): Promise<IpcResponse<T>> {
  try {
    const data = await handler();
    return { success: true, data };
  } catch (err) {
    log.error(`IPC error on ${channel}:`, err);
    return { success: false, error: classifyError(err) };
  }
}
