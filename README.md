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

### Adding a Client

1. Click **Clients** in the navigation
2. Click **Add Client**
3. Fill in the required fields
4. Click **Add Client**

**Shortcut:** Press `Ctrl+N` (Windows) or `Cmd+N` (Mac) from the Clients page

### Logging a Session

1. Click **Sessions** in the navigation
2. Click **Log Session**
3. Select the client and fill in session details
4. Click **Log Session**

**Shortcut:** Press `Ctrl+N` (Windows) or `Cmd+N` (Mac) from the Sessions or Calendar page

### Managing Therapists (Admin Only)

1. Click **Therapists** in the navigation
2. Click **Add Therapist**
3. Enter name, start date, and check **Is Admin** if applicable

**Shortcut:** Press `Ctrl+N` (Windows) or `Cmd+N` (Mac) from the Therapists page

### Changing Database Location

1. Click **Settings** in the navigation
2. Click **Change Database Location**
3. Select the new database file
4. Restart the app

### Closing a Client

1. Open the client's detail page
2. Click **Close Client**
3. Enter the outcome and any closing notes
4. Confirm

## Troubleshooting

**Error messages**
- Errors are written to log files in your system's app data folder
- Share log files with your administrator if issues persist

**Concurrent editing**
- TherapyLog uses optimistic locking to prevent data loss
- If someone else edits a record while you're working on it, you'll be notified and can review the changes before saving

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
