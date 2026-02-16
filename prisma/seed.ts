import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env["DATABASE_URL"]!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Therapists ─────────────────────────────────────────────────────
  const alice = await prisma.therapist.create({
    data: { first_name: "Alice", last_name: "Morgan", is_admin: true },
  });

  const bob = await prisma.therapist.create({
    data: { first_name: "Bob", last_name: "Chen", is_admin: false },
  });

  // ── Clients ────────────────────────────────────────────────────────
  const clientA = await prisma.client.create({
    data: {
      hospital_number: "H-1001",
      first_name: "Charlie",
      last_name: "Davis",
      dob: new Date("2012-03-15"),
      session_day: "Tuesday",
      session_time: "10:00",
      therapist_id: alice.id,
      pre_score: 28.5,
    },
  });

  const clientB = await prisma.client.create({
    data: {
      hospital_number: "H-1002",
      first_name: "Dana",
      last_name: "Evans",
      dob: new Date("2014-07-22"),
      session_day: "Thursday",
      session_time: "14:00",
      therapist_id: alice.id,
    },
  });

  const clientC = await prisma.client.create({
    data: {
      hospital_number: "H-1003",
      first_name: "Eli",
      last_name: "Foster",
      dob: new Date("2010-11-05"),
      session_day: "Wednesday",
      session_time: "11:00",
      therapist_id: bob.id,
      pre_score: 32.0,
      post_score: 18.0,
      outcome: "Improved",
      is_closed: true,
    },
  });

  // ── Sessions ───────────────────────────────────────────────────────
  await prisma.session.createMany({
    data: [
      {
        client_id: clientA.id,
        therapist_id: alice.id,
        scheduled_at: new Date("2026-02-04T10:00:00"),
        occurred_at: new Date("2026-02-04T10:05:00"),
        status: "Attended",
        session_type: "AssessmentChild",
        delivery_method: "FaceToFace",
        notes: "Initial assessment completed.",
      },
      {
        client_id: clientA.id,
        therapist_id: alice.id,
        scheduled_at: new Date("2026-02-11T10:00:00"),
        status: "DNA",
        session_type: "Child",
        delivery_method: "FaceToFace",
        missed_reason: "NoShow",
      },
      {
        client_id: clientB.id,
        therapist_id: alice.id,
        scheduled_at: new Date("2026-02-06T14:00:00"),
        occurred_at: new Date("2026-02-06T14:00:00"),
        status: "Attended",
        session_type: "Parent",
        delivery_method: "Online",
      },
      {
        client_id: clientB.id,
        therapist_id: alice.id,
        scheduled_at: new Date("2026-02-13T14:00:00"),
        status: "Cancelled",
        session_type: "Parent",
        delivery_method: "Online",
        missed_reason: "Illness",
      },
      {
        client_id: clientC.id,
        therapist_id: bob.id,
        scheduled_at: new Date("2026-02-19T11:00:00"),
        status: "Scheduled",
        session_type: "CheckIn",
        delivery_method: "Telephone",
        notes: "Post-discharge follow-up call.",
      },
    ],
  });

  console.log("Seed complete.");
}

try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
