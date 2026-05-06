import { PrismaClient } from "../../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import log from "./logger";

export function createPrismaClient(url: string): PrismaClient | null {
  try {
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({ adapter });
  } catch (err) {
    log.error("Failed to create Prisma client:", err);
    return null;
  }
}
