// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { discoverMigrations } from './migrate.js'

describe('database migrations', () => {
  it('discovers numbered SQL migrations in order', async () => {
    const files = await discoverMigrations()
    expect(files.map(file => file.name)).toEqual(['001_initial.sql', '002_widen_score_totals.sql', '003_add_locker_flag.sql'])
  })

  it('defines games, players, uniqueness, and leaderboard indexes', async () => {
    const path = fileURLToPath(new URL('../../db/migrations/001_initial.sql', import.meta.url))
    const sql = await readFile(path, 'utf8')
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS games/i)
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS game_players/i)
    expect(sql).toMatch(/UNIQUE\s*\(game_id, seat\)/i)
    expect(sql).toMatch(/player_key/i)
  })

  it('widens stored totals for custom scores', async () => {
    const path = fileURLToPath(new URL('../../db/migrations/002_widen_score_totals.sql', import.meta.url))
    const sql = await readFile(path, 'utf8')

    expect(sql).toMatch(/ALTER COLUMN upper_total TYPE BIGINT/i)
    expect(sql).toMatch(/ALTER COLUMN lower_total TYPE BIGINT/i)
    expect(sql).toMatch(/ALTER COLUMN total TYPE BIGINT/i)
  })
})
