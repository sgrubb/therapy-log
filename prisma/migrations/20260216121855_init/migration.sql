-- CreateTable
CREATE TABLE "Therapist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Client" (
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
    "therapist_id" INTEGER NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "pre_score" REAL,
    "post_score" REAL,
    "outcome" TEXT,
    "notes" TEXT,
    CONSTRAINT "Client_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "Therapist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "client_id" INTEGER NOT NULL,
    "therapist_id" INTEGER NOT NULL,
    "scheduled_at" DATETIME NOT NULL,
    "occurred_at" DATETIME,
    "status" TEXT NOT NULL,
    "session_type" TEXT NOT NULL,
    "delivery_method" TEXT NOT NULL,
    "missed_reason" TEXT,
    "notes" TEXT,
    CONSTRAINT "Session_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Session_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "Therapist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_hospital_number_key" ON "Client"("hospital_number");
