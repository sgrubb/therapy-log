import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../../generated/prisma/client";

const MIGRATION_PATH = path.join(
  __dirname,
  "..",
  "..",
  "prisma",
  "migrations",
  "20260216121855_init",
  "migration.sql",
);

export function createTestPrismaClient(): {
  prisma: PrismaClient;
  dbPath: string;
} {
  const dbPath = path.join(
    os.tmpdir(),
    `therapy-log-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
  );

  const db = new Database(dbPath);
  const migrationSql = fs.readFileSync(MIGRATION_PATH, "utf-8");
  db.exec(migrationSql);
  db.close();

  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  const prisma = new PrismaClient({ adapter });

  return { prisma, dbPath };
}

export function cleanupTestDb(dbPath: string): void {
  try {
    fs.unlinkSync(dbPath);
  } catch {
    // ignore if already removed
  }
}

interface SeedIds {
  therapistAlice: number;
  therapistBob: number;
  clientCharlie: number;
  clientDana: number;
  sessionId: number;
}

export async function seedTestData(prisma: PrismaClient): Promise<SeedIds> {
  const alice = await prisma.therapist.create({
    data: { first_name: "Alice", last_name: "Morgan", is_admin: true },
  });

  const bob = await prisma.therapist.create({
    data: { first_name: "Bob", last_name: "Chen", is_admin: false },
  });

  const charlie = await prisma.client.create({
    data: {
      hospital_number: "H-1001",
      first_name: "Charlie",
      last_name: "Davis",
      dob: new Date("2012-03-15"),
      session_day: "Tuesday",
      session_time: "10:00",
      therapist_id: alice.id,
    },
  });

  const dana = await prisma.client.create({
    data: {
      hospital_number: "H-1002",
      first_name: "Dana",
      last_name: "Evans",
      dob: new Date("2014-07-22"),
      therapist_id: bob.id,
    },
  });

  const session = await prisma.session.create({
    data: {
      client_id: charlie.id,
      therapist_id: alice.id,
      scheduled_at: new Date("2026-02-04T10:00:00"),
      occurred_at: new Date("2026-02-04T10:05:00"),
      status: "Attended",
      session_type: "AssessmentChild",
      delivery_method: "FaceToFace",
      notes: "Initial assessment.",
    },
  });

  return {
    therapistAlice: alice.id,
    therapistBob: bob.id,
    clientCharlie: charlie.id,
    clientDana: dana.id,
    sessionId: session.id,
  };
}
