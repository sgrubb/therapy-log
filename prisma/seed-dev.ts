/**
 * Dev-only seed data. Run via: npm run db:seed
 * Populates the database with sample therapists, clients, and sessions
 * for local development. Not used in production.
 */
import "dotenv/config";
import {
  startOfWeek,
  addDays,
  addWeeks,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { CURRENT_SCHEMA_VERSION } from "../electron/generated/migrations.generated";

const adapter = new PrismaBetterSqlite3({
  url: process.env["DATABASE_URL"]!,
});
const prisma = new PrismaClient({ adapter });

function thisWeekDay(dayOffset: number, hours: number, minutes: number): Date {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const day = addDays(monday, dayOffset);
  return setMilliseconds(setSeconds(setMinutes(setHours(day, hours), minutes), 0), 0);
}

async function main() {
  // ── Schema version ─────────────────────────────────────────────────
  await prisma.metadata.upsert({
    where: { key: "schema_version" },
    update: {},
    create: { key: "schema_version", value: String(CURRENT_SCHEMA_VERSION) },
  });

  // ── Therapists ─────────────────────────────────────────────────────
  const alice = await prisma.therapist.create({
    data: { first_name: "Alice", last_name: "Morgan", is_admin: true },
  });

  const bob = await prisma.therapist.create({
    data: { first_name: "Bob", last_name: "Chen", is_admin: false },
  });

  // ── Clients ────────────────────────────────────────────────────────

  // Open client — Tuesday sessions with Alice
  const clientA = await prisma.client.create({
    data: {
      hospital_number: "H-1001",
      first_name: "Charlie",
      last_name: "Davis",
      dob: new Date("2012-03-15T00:00:00"),
      start_date: addWeeks(thisWeekDay(1, 10, 0), -8),
      phone: "07700900101",
      session_day: "Tuesday",
      session_time: "10:00",
      session_duration: 60,
      session_delivery_method: "FaceToFace",
      therapist_id: alice.id,
      pre_score: 28.5,
    },
  });

  // Open client — Thursday sessions with Alice
  const clientB = await prisma.client.create({
    data: {
      hospital_number: "H-1002",
      first_name: "Dana",
      last_name: "Evans",
      dob: new Date("2014-07-22T00:00:00"),
      start_date: addWeeks(thisWeekDay(3, 14, 0), -6),
      email: "dana.evans@example.com",
      session_day: "Thursday",
      session_time: "14:00",
      session_duration: 50,
      session_delivery_method: "Online",
      therapist_id: alice.id,
      pre_score: 24.0,
    },
  });

  // Closed client — Wednesday sessions with Bob, discharged
  const clientC = await prisma.client.create({
    data: {
      hospital_number: "H-1003",
      first_name: "Eli",
      last_name: "Foster",
      dob: new Date("2010-11-05T00:00:00"),
      start_date: addWeeks(thisWeekDay(2, 11, 0), -20),
      phone: "07700900303",
      session_day: "Wednesday",
      session_time: "11:00",
      session_duration: 60,
      session_delivery_method: "Telephone",
      therapist_id: bob.id,
      pre_score: 32.0,
      post_score: 18.0,
      outcome: "Improved",
      closed_date: addWeeks(thisWeekDay(2, 11, 0), -2),
      notes: "Discharged following successful intervention. Significant improvement in scores.",
    },
  });

  // ── Sessions ───────────────────────────────────────────────────────

  const tuesdayThisWeek = thisWeekDay(1, 10, 0); // Monday=0, Tuesday=1
  const thursdayThisWeek = thisWeekDay(3, 14, 0);
  const wednesdayThisWeek = thisWeekDay(2, 11, 0);

  await prisma.session.createMany({
    data: [
      // Charlie — assessment 8 weeks ago
      {
        client_id: clientA.id,
        therapist_id: alice.id,
        scheduled_at: addWeeks(tuesdayThisWeek, -8),
        occurred_at: addWeeks(tuesdayThisWeek, -8),
        duration: 60,
        status: "Attended",
        session_type: "AssessmentChild",
        delivery_method: "FaceToFace",
        notes: "Initial assessment completed. SDQ score 28.5.",
      },
      // Charlie — DNA 2 weeks ago
      {
        client_id: clientA.id,
        therapist_id: alice.id,
        scheduled_at: addWeeks(tuesdayThisWeek, -2),
        duration: 60,
        status: "DNA",
        session_type: "Child",
        delivery_method: "FaceToFace",
        missed_reason: "NoShow",
      },
      // Charlie — session this Tuesday (upcoming)
      {
        client_id: clientA.id,
        therapist_id: alice.id,
        scheduled_at: tuesdayThisWeek,
        duration: 60,
        status: "Scheduled",
        session_type: "Child",
        delivery_method: "FaceToFace",
      },
      // Dana — assessment 6 weeks ago
      {
        client_id: clientB.id,
        therapist_id: alice.id,
        scheduled_at: addWeeks(thursdayThisWeek, -6),
        occurred_at: addWeeks(thursdayThisWeek, -6),
        duration: 50,
        status: "Attended",
        session_type: "AssessmentParentFamily",
        delivery_method: "Online",
        notes: "Parent assessment. Discussed goals.",
      },
      // Dana — session last week, cancelled
      {
        client_id: clientB.id,
        therapist_id: alice.id,
        scheduled_at: addWeeks(thursdayThisWeek, -1),
        duration: 50,
        status: "Cancelled",
        session_type: "Parent",
        delivery_method: "Online",
        missed_reason: "Illness",
      },
      // Dana — session this Thursday (upcoming)
      {
        client_id: clientB.id,
        therapist_id: alice.id,
        scheduled_at: thursdayThisWeek,
        duration: 50,
        status: "Scheduled",
        session_type: "Parent",
        delivery_method: "Online",
      },
      // Eli — several past sessions before discharge
      {
        client_id: clientC.id,
        therapist_id: bob.id,
        scheduled_at: addWeeks(wednesdayThisWeek, -20),
        occurred_at: addWeeks(wednesdayThisWeek, -20),
        duration: 60,
        status: "Attended",
        session_type: "AssessmentChild",
        delivery_method: "Telephone",
        notes: "Initial assessment. SDQ 32.",
      },
      {
        client_id: clientC.id,
        therapist_id: bob.id,
        scheduled_at: addWeeks(wednesdayThisWeek, -16),
        occurred_at: addWeeks(wednesdayThisWeek, -16),
        duration: 60,
        status: "Attended",
        session_type: "Child",
        delivery_method: "Telephone",
      },
      {
        client_id: clientC.id,
        therapist_id: bob.id,
        scheduled_at: addWeeks(wednesdayThisWeek, -8),
        occurred_at: addWeeks(wednesdayThisWeek, -8),
        duration: 60,
        status: "Attended",
        session_type: "Child",
        delivery_method: "Telephone",
        notes: "Good progress noted.",
      },
      {
        client_id: clientC.id,
        therapist_id: bob.id,
        scheduled_at: addWeeks(wednesdayThisWeek, -2),
        occurred_at: addWeeks(wednesdayThisWeek, -2),
        duration: 60,
        status: "Attended",
        session_type: "CheckIn",
        delivery_method: "Telephone",
        notes: "Final session. Discharge discussed.",
      },
    ],
  });

  console.log("Dev seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
