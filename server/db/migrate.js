import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const migrationsDirectory = fileURLToPath(new URL('../../db/migrations/', import.meta.url))

export async function discoverMigrations(directory = migrationsDirectory) {
  const entries = await readdir(directory, { withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && /^\d{3}_[a-z0-9_]+\.sql$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(entry => ({ name: entry.name, path: new URL(`../../db/migrations/${entry.name}`, import.meta.url) }))
}

export async function runMigrations(pool) {
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [827_194_611])
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())')
    const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map(row => row.name))
    for (const migration of await discoverMigrations()) {
      if (applied.has(migration.name)) continue
      const sql = await readFile(migration.path, 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [migration.name])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [827_194_611]).catch(() => {})
    client.release()
  }
}
