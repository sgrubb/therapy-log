# TherapyLog - User Guide

Session management tool for NHS therapists.

## Installation

Download the latest installer from the [Releases page](https://github.com/sgrubb/therapy-log/releases/latest) and run it — download the `.exe` file on Windows or the `.dmg` file on macOS. On first launch you'll be prompted to set up your database.

## First-Run Setup

When you first open TherapyLog, you'll see two options:

**Create New Database**
- Choose this if you're the first person setting up
- Pick a location on your shared network drive or cloud storage folder
- A new database file will be created

**Use Existing Database**
- Choose this if a colleague has already created a database
- Select the `.db` file from your shared network drive or cloud storage folder
- You'll be able to view and edit the same data

For shared use, store the database in a synchronised cloud folder (e.g. OneDrive, Google Drive) or on a network drive accessible to all therapists.

## Using TherapyLog

### Selecting your therapist

The dropdown in the top-right corner of the app lets you select which therapist you are. This controls whose data is filtered by default when you tick "Mine" on any page, and determines whether you see admin features.

**If you're setting up the app for the first time**, the setup wizard will ask for your name before finishing — this creates your admin therapist account automatically. Once the app opens, select yourself from the dropdown in the top right to get started.

If a colleague has already set the system up and you're joining an existing database, ask them to add you on the **Therapists** page first, then select yourself from the dropdown.

---

### Clients

**Adding a client**
1. Click **Clients** in the navigation
2. Click **Add Client**
3. Fill in the required fields (name, hospital number, date of birth, contact details, assigned therapist, start date)
4. Optionally set a recurring session schedule (day, time, duration, delivery method) — this is used to generate expected sessions on the calendar and sessions page
5. Click **Add Client**

**Shortcut:** Press `Ctrl+N` (Windows) or `Cmd+N` (Mac) from the Clients page

**Closing a client**
1. Open the client's detail page
2. Click **Close Client**
3. Enter the close date, outcome, optional post-intervention score, and any closing notes
4. Click **Close Client**

**Reopening a client**
1. Open a closed client's detail page
2. Click **Reopen Client**
3. Enter any notes and confirm
4. The client's outcome and post-score are cleared and they return to open status

---

### Sessions

**Logging a session**
1. Click **Sessions** in the navigation
2. Click **Log Session**
3. Select the client (this auto-fills the therapist and any recurring schedule defaults)
4. Fill in the session details and outcome
5. Click **Log Session**

**Shortcut:** Press `Ctrl+N` (Windows) or `Cmd+N` (Mac) from the Sessions page

**Expected sessions**

The top of the sessions page shows an **Expected Sessions** panel (collapsible). These are upcoming sessions generated from each client's recurring schedule — they are not yet logged sessions. Click **Log** next to an expected session to open a pre-filled session form for that client.

**Confirming a session**

Sessions can be saved without a status (unconfirmed) — for example, when a session is booked but hasn't happened yet. Once the session has taken place:

1. Open the session's detail page
2. Click **Confirm Session**
3. Select the outcome (Attended, DNA, Cancelled, or Rescheduled) and fill in the relevant details
4. Click **Confirm**

**Session indicators**

The sessions list and calendar highlight sessions that need attention:

- **Overdue** (red clock): a past session with no confirmed outcome
- **Unconfirmed** (amber clock): a session saved without a status
- **Overlapping** (red alert): two sessions scheduled at the same time for the same therapist

Use the filter checkboxes on the sessions page to show only overdue, unconfirmed, or overlapping sessions.

---

### Calendar

The calendar shows both logged sessions and expected sessions (from recurring client schedules) in week or month view.

**Creating a session from the calendar**
- **Click an expected session** (shown with a lighter style): opens a new session form pre-filled with the client's details, date, and time
- **Click and drag a time slot**: opens a new session form pre-filled with the selected date, time, and duration

Click any logged session event to go to its detail page.

Sessions are colour-coded: green (Attended), red (DNA/Cancelled), amber (Unconfirmed). Overlapping sessions are highlighted with a red alert icon.

**Shortcut:** Press `Ctrl+N` (Windows) or `Cmd+N` (Mac) from the Calendar page to open a new session form

---

### Therapists (Admin Only)

**Adding a therapist**
1. Click **Therapists** in the navigation
2. Click **Add Therapist**
3. Enter name, start date, and check **Is Admin** if applicable
4. Click **Add Therapist**

**Shortcut:** Press `Ctrl+N` (Windows) or `Cmd+N` (Mac) from the Therapists page

**Deactivating a therapist**
1. Open the therapist's detail page
2. Click **Deactivate**
3. Reassign each of their open clients to another active therapist using the dropdowns shown
4. Click **Confirm Deactivate**

All client reassignments happen in a single step. The therapist is deactivated only after all clients have been reassigned.

You cannot deactivate yourself, and you cannot deactivate the last remaining admin. If the therapist being deactivated is the only admin, edit another therapist first to give them admin access, then deactivate the original admin.

**Reactivating a therapist**
1. Open an inactive therapist's detail page
2. Click **Reactivate** and confirm

---

### Importing and Exporting Data

Clients, sessions, and therapists (admin only) can all be imported from or exported to CSV.

**Exporting**
1. Navigate to the relevant page (Clients, Sessions, or Therapists)
2. Apply any filters you want — the export will match your current filtered view
3. Click **Export CSV** and choose a save location

**Importing**
1. Navigate to the relevant page
2. Click **Import CSV**
3. Download the **template** if you need a reference for the expected columns
4. Select your CSV file
5. Click **Import**

If any row in the file is invalid, the entire import is rejected and no records are inserted. Each error message includes the row number and a description of the problem.

---

### Settings

**Changing database location**
1. Click **Settings** in the navigation
2. Click **Change Database Location**
3. Select the new `.db` file
4. Restart the app to connect to the new database

---

### Refreshing data and concurrent editing

Because multiple therapists can have the app open at the same time against a shared database, data shown on screen may become out of date as colleagues make changes. Each main page has a **refresh button** (↻) in the header — click it to pull in the latest data immediately. Data also refreshes automatically in the background roughly every minute.

If two people open the same record at the same time and one saves first, the second person will see a conflict warning when they try to save. Reload the record to see the current version and re-enter your changes on top of it.

## Troubleshooting

**Error messages**
- Errors are written to log files in your system's app data folder
- Share log files with your administrator if issues persist

**Backup**
- Your database is a single `.db` file
- Recommended: enable automatic backup in your cloud storage settings
- Manual backup: copy the `.db` file to a safe location

---

## Development

### Setup

```
npm install
npm run dev
```

### Running Tests

```
npm test
```

For watch mode during development:

```
npm run test:watch
```

### Building for Production

Before building, place icon files in `assets/`:
- `assets/icon.png` — 1024×1024 source image
- `assets/icon.ico` — Windows (convert from PNG; embed 16, 32, 48, 256px sizes)
- `assets/icon.icns` — macOS (convert from PNG using `iconutil` or an online tool)

```
npm run package:win   # Windows NSIS installer
npm run package:mac   # macOS DMG
npm run package:all   # Windows + macOS
npm run package:dir   # Unpacked (for testing without installer)
```

Output is written to `dist/`.

### Project Structure

```
electron/         Main process (Node.js) — IPC handlers, DB access
electron-tests/   Integration tests for electron handlers
src/              Renderer process (React)
tests/            Renderer unit and integration tests
shared/           Types, schemas, and enums shared by both processes
shared-tests/     Tests for shared logic
prisma/           Database schema and migrations
scripts/          Build-time code generation scripts
generated/        Generated migration bundle (committed, do not edit manually)
```

### Creating a Release

Run one of the release scripts, which bumps `package.json`, commits, tags, and pushes in one step:

```
npm run release:patch   # 0.1.0 → 0.1.1
npm run release:minor   # 0.1.0 → 0.2.0
npm run release:major   # 0.1.0 → 1.0.0
```

This triggers the release workflow, which builds installers for Windows and macOS and publishes them as a GitHub Release.

### Database Migrations

Edit `prisma/schema.prisma`, then:

```
npm run db:migrate
```

This creates a migration file and updates the TypeScript types. Run `npm run generate:migrations` to re-bundle migrations into `generated/` (this runs automatically as part of the build).
