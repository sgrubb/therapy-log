-- RedefineTables
PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

CREATE TABLE "new_Therapist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "deactivated_date" DATETIME,
    "updated_at" DATETIME NOT NULL
);

INSERT INTO "new_Therapist" ("id", "first_name", "last_name", "is_admin", "updated_at")
SELECT "id", "first_name", "last_name", "is_admin", "updated_at"
FROM "Therapist";

DROP TABLE "Therapist";
ALTER TABLE "new_Therapist" RENAME TO "Therapist";

PRAGMA foreign_keys = ON;
PRAGMA defer_foreign_keys = OFF;
