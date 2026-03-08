/*
  Warnings:

  - Added the required column `duration` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hospital_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "dob" DATETIME NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "session_day" TEXT,
    "session_time" TEXT,
    "session_duration" INTEGER,
    "session_delivery_method" TEXT,
    "therapist_id" INTEGER NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "pre_score" REAL,
    "post_score" REAL,
    "outcome" TEXT,
    "notes" TEXT,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Client_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "Therapist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Client" ("address", "dob", "email", "first_name", "hospital_number", "id", "is_closed", "last_name", "notes", "outcome", "phone", "post_score", "pre_score", "session_day", "session_time", "therapist_id", "updated_at") SELECT "address", "dob", "email", "first_name", "hospital_number", "id", "is_closed", "last_name", "notes", "outcome", "phone", "post_score", "pre_score", "session_day", "session_time", "therapist_id", "updated_at" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_hospital_number_key" ON "Client"("hospital_number");
CREATE TABLE "new_Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_id" INTEGER NOT NULL,
    "therapist_id" INTEGER NOT NULL,
    "scheduled_at" DATETIME NOT NULL,
    "occurred_at" DATETIME,
    "duration" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "session_type" TEXT NOT NULL,
    "delivery_method" TEXT NOT NULL,
    "missed_reason" TEXT,
    "notes" TEXT,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Session_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Session_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "Therapist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("client_id", "delivery_method", "duration", "id", "missed_reason", "notes", "occurred_at", "scheduled_at", "session_type", "status", "therapist_id", "updated_at") SELECT "client_id", "delivery_method", 60, "id", "missed_reason", "notes", "occurred_at", "scheduled_at", "session_type", "status", "therapist_id", "updated_at" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE TABLE "new_Therapist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_Therapist" ("first_name", "id", "is_admin", "last_name", "updated_at") SELECT "first_name", "id", "is_admin", "last_name", "updated_at" FROM "Therapist";
DROP TABLE "Therapist";
ALTER TABLE "new_Therapist" RENAME TO "Therapist";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
