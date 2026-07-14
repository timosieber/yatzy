import { resolve } from 'node:path'
import process from 'node:process'
import pg from 'pg'
import { createApp } from './app.js'
import { runMigrations } from './db/migrate.js'
import { PostgresGameRepository } from './repositories/postgresRepository.js'

const { Pool } = pg
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('Start abgebrochen: DATABASE_URL fehlt. Verbinde in Railway einen PostgreSQL-Dienst.')
  process.exit(1)
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.PGPOOL_MAX ?? 10),
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
})

try {
  await runMigrations(pool)
} catch (error) {
  console.error('Datenbankmigration fehlgeschlagen.', error)
  await pool.end().catch(() => {})
  process.exit(1)
}

const port = Number(process.env.PORT ?? 3001)
const app = createApp({
  repository: new PostgresGameRepository(pool),
  serveClient: true,
  staticDirectory: resolve('dist'),
})
const server = app.listen(port, '0.0.0.0', () => {
  console.info(JSON.stringify({ level: 'info', event: 'server_started', port }))
})

async function shutdown(signal) {
  console.info(JSON.stringify({ level: 'info', event: 'shutdown', signal }))
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.once('SIGTERM', () => shutdown('SIGTERM'))
process.once('SIGINT', () => shutdown('SIGINT'))
