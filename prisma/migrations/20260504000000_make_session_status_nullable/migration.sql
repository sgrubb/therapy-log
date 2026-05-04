-- Make Session.status nullable and drop the 'Scheduled' enum value.
--
-- Existing 'Scheduled' rows are backfilled inline during the table rebuild:
--   past Scheduled  → Attended, with occurred_at = scheduled_at
--   future Scheduled → NULL (unconfirmed)
--
-- SQLite requires a full table rebuild to change a column from NOT NULL to NULL,
-- so the data transform piggybacks on the same INSERT … SELECT.

PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

CREATE TABLE "new_Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_id" INTEGER NOT NULL,
    "therapist_id" INTEGER NOT NULL,
    "scheduled_at" DATETIME NOT NULL,
    "occurred_at" DATETIME,
    "duration" INTEGER NOT NULL,
    "status" TEXT,
    "session_type" TEXT NOT NULL,
    "delivery_method" TEXT NOT NULL,
    "missed_reason" TEXT,
    "notes" TEXT,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Session_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Session_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "Therapist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Session" (
    "client_id", "delivery_method", "duration", "id", "missed_reason", "notes",
    "occurred_at", "scheduled_at", "session_type", "status", "therapist_id", "updated_at"
)
SELECT
    "client_id", "delivery_method", "duration", "id", "missed_reason", "notes",
    CASE
        WHEN "status" = 'Scheduled' AND "scheduled_at" < CURRENT_TIMESTAMP THEN "scheduled_at"
        ELSE "occurred_at"
    END,
    "scheduled_at", "session_type",
    CASE
        WHEN "status" = 'Scheduled' AND "scheduled_at" < CURRENT_TIMESTAMP THEN 'Attended'
        WHEN "status" = 'Scheduled' THEN NULL
        ELSE "status"
    END,
    "therapist_id", "updated_at"
FROM "Session";

DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;
