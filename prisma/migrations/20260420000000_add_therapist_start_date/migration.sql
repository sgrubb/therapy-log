-- Add Therapist.start_date as a required column. Existing rows are backfilled
-- with the earliest scheduled session date for that therapist (or
-- CURRENT_TIMESTAMP if they have no sessions yet).

PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

CREATE TABLE "new_Therapist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "start_date" DATETIME NOT NULL,
    "deactivated_date" DATETIME,
    "updated_at" DATETIME NOT NULL
);

INSERT INTO "new_Therapist" (
    "id", "first_name", "last_name", "is_admin", "start_date", "deactivated_date", "updated_at"
)
SELECT
    t."id", t."first_name", t."last_name", t."is_admin",
    COALESCE(
        (SELECT MIN(s."scheduled_at") FROM "Session" s WHERE s."therapist_id" = t."id"),
        CURRENT_TIMESTAMP
    ),
    t."deactivated_date",
    t."updated_at"
FROM "Therapist" t;

DROP TABLE "Therapist";
ALTER TABLE "new_Therapist" RENAME TO "Therapist";

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;
