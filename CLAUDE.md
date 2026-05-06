# Therapy Log

Electron + React + TypeScript desktop app for tracking therapy sessions, built on Vite, Prisma (SQLite via better-sqlite3), and Radix UI primitives.

Path alias: `@/*` maps to `src/*`. The `electron/` and `prisma/` directories live outside that alias. Shared types and Zod schemas live in `shared/` and are imported by both the renderer and the main process.

## Testing policy

Every test should exercise logic that **only exists at that layer**. Tests that re-assert logic from a lower layer are duplicative — they add runtime cost and refactoring friction without adding signal.

### Layer rules

| Layer | Rule | Notes |
|---|---|---|
| **Shared / form schemas** (`shared/schemas/`, `src/lib/schemas/forms.ts`) | Always unit-test custom refinements, transforms, and cross-field rules. Skip trivial Zod compositions. | A `superRefine` block deserves a test; a `z.string().min(1)` does not. |
| **Mappers / pure utilities** (`electron/lib/mappers/`, `electron/lib/utils/`, `src/lib/utils/`) | Always unit-test. | Pure inputs-in / outputs-out functions are cheap to cover and high-leverage. |
| **Hooks with real state transitions** (`src/hooks/`) | Unit-test via `renderHook`. | Hooks like `use-session-form` are state machines; their transitions belong tested directly, not inferred from page assertions. |
| **Components with internal state** (`src/components/`) | Test stateful domain components (dialogs with their own form state, complex composite components). | Skip pure UI primitives unless they have logic. |
| **Contexts** (`src/context/`) | Always test. | |
| **Pages** (`src/pages/`) | Integration-test the user journeys: happy path, key conditional renders, key error states. Do **not** enumerate every internal branch — rely on hook/schema tests for that. | |
| **Electron handlers** (`electron/handlers/`) | Integration-test critical paths using the shared Prisma + dialog fixtures. | |

### Anti-patterns to avoid

- A hook test that just re-asserts a schema rule.
- A page test that enumerates every state transition in a hook.
- A component test that re-asserts what a hook test already covers.
- Adding a test "for completeness" when no logic at that layer would catch a regression a lower-layer test wouldn't.

### When refactoring tests

Don't delete an existing test outright if it's the only thing covering a behavior. Migrate first: add the lower-layer test, confirm it covers the case, then trim the redundant assertion from the page/integration test.

### Electron test fixtures

Electron-side tests use fixtures in `electron-tests/helpers/` to avoid spinning up Electron itself:
- A Prisma fixture that creates a temp SQLite DB, runs migrations, and returns a connected client.
- Mock `ipcMain` and `dialog` shims that capture handler registrations and let tests invoke them with controlled inputs.

If you're adding the second test for a new handler module, add the fixture rather than inlining the setup again.

## Code style

- **Async/await + try/catch** — never promise chaining (`.then`/`.catch`/`.finally`).
- **Absolute path aliases** (`@/...`) for imports within `src/` — never relative.
- **Functional style** — `map`/`reduce`/`filter` over `for` loops; avoid mutable `let`; prefer `const`. For switch-based value derivation, use an IIFE rather than `let x = 0; switch (...) { x = ...; break; }`.
- **Multi-line `if`** with curly braces — never single-line `if (x) return;`.
- **Wrap long lines** under ~120 characters; break long function calls, JSX attributes, and ternaries across multiple lines.
- **Comments** — only when the *why* is non-obvious. Don't restate what the code does.

## CSV error message conventions

User-facing CSV import errors are the only place where shared validation messages reach end users (form-side validation uses its own user-friendly schemas; server-side IPC failures get wrapped in a generic alert). The convention:

- **Column names** in `"double quotes"`: `"scheduled_time" must be in HH:MM format`.
- **Enum values** in `"double quotes"`, comma-separated: `must be one of: "Attended", "DNA", "Cancelled", "Rescheduled"`.
- **Status values** quoted when embedded in cross-field messages: `"occurred_date" and "occurred_time" must not be set when status is "DNA"`.
