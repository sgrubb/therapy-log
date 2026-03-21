import fs from 'fs'
import path from 'path'

const MIGRATIONS_DIR = 'prisma/migrations'
const OUTPUT_FILE = 'electron/generated/migrations.generated.ts'

function generateMigrations() {
  try {
    const migrationDirs = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => fs.statSync(path.join(MIGRATIONS_DIR, f)).isDirectory())
      .sort()

    const version = migrationDirs.length

    const migrationEntries = migrationDirs.map((dir, index) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf-8')
      const escaped = sql.replace(/`/g, '\\`').replace(/\${/g, '\\${')
      return `  ${index + 1}: \`${escaped.trim()}\``
    }).join(',\n\n')

    const code = `// This file is auto-generated. Do not edit manually.
// Generated from Prisma migrations via scripts/generate-migrations.ts

export const CURRENT_SCHEMA_VERSION = ${version};

// Per-step migration SQL. MIGRATIONS[N] upgrades the schema from version N-1 to N.
export const MIGRATIONS: Record<number, string> = {
${migrationEntries}
};
`

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
    fs.writeFileSync(OUTPUT_FILE, code, 'utf-8')
    console.log(`✓ Generated ${OUTPUT_FILE}`)
    console.log(`✓ Schema version: ${version}`)
  } catch (error) {
    console.error('Failed to generate migrations:', error)
    process.exit(1)
  }
}

generateMigrations()
