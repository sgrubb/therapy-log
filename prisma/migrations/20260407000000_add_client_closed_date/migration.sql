-- RedefineTables
PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

CREATE TABLE "new_Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hospital_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "dob" DATETIME NOT NULL,
    "start_date" DATETIME NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "session_day" TEXT,
    "session_time" TEXT,
    "session_duration" INTEGER,
    "session_delivery_method" TEXT,
    "therapist_id" INTEGER NOT NULL,
    "closed_date" DATETIME,
    "pre_score" REAL,
    "post_score" REAL,
    "outcome" TEXT,
    "notes" TEXT,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Client_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "Therapist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Client" (
    "id", "hospital_number", "first_name", "last_name", "dob", "start_date",
    "address", "phone", "email", "session_day", "session_time",
    "session_duration", "session_delivery_method", "therapist_id",
    "pre_score", "post_score", "outcome", "notes", "updated_at"
)
SELECT
    "id", "hospital_number", "first_name", "last_name", "dob", "start_date",
    "address", "phone", "email", "session_day", "session_time",
    "session_duration", "session_delivery_method", "therapist_id",
    "pre_score", "post_score", "outcome", "notes", "updated_at"
FROM "Client";

DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE UNIQUE INDEX "Client_hospital_number_key" ON "Client"("hospital_number");

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;
