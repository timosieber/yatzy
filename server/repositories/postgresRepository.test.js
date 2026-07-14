// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { newDb } from 'pg-mem'
import { validateCompletedGame } from '../gameService.js'
import { completedGame } from '../test/fixtures.js'
import { PostgresGameRepository } from './postgresRepository.js'

async function createRepository() {
  const database = newDb()
  const adapter = database.adapters.createPg()
  const pool = new adapter.Pool()
  for (const name of ['001_initial.sql', '002_widen_score_totals.sql']) {
    const sql = await readFile(new URL(`../../db/migrations/${name}`, import.meta.url), 'utf8')
    await pool.query(sql)
  }
  return { pool, repository: new PostgresGameRepository(pool) }
}

describe('PostgresGameRepository', () => {
  it('stores, reads, lists, and de-duplicates a canonical game', async () => {
    const { pool, repository } = await createRepository()
    const game = validateCompletedGame(completedGame())

    expect((await repository.saveGame(game)).created).toBe(true)
    expect((await repository.saveGame(game)).created).toBe(false)
    expect((await repository.getGame(game.id)).players).toHaveLength(2)
    expect((await repository.listGames({ limit: 10 })).games).toHaveLength(1)
    await pool.end()
  })

  it('aggregates normalized leaderboard statistics', async () => {
    const { pool, repository } = await createRepository()
    const first = validateCompletedGame(completedGame({ id: '10000000-0000-4000-8000-000000000021', names: ['Timo', 'Mara'] }))
    const secondPayload = completedGame({ id: '10000000-0000-4000-8000-000000000022', names: ['timo', 'Noah'] })
    secondPayload.completedAt = '2026-07-14T13:00:00.000Z'
    secondPayload.players[0].scores.yatzy = 50
    await repository.saveGame(first)
    await repository.saveGame(validateCompletedGame(secondPayload))

    const rows = await repository.getLeaderboard({ mode: 'standard', limit: 20 })

    expect(rows[0]).toMatchObject({ playerName: 'timo', bestScore: 50, gamesPlayed: 2, wins: 2 })
    expect(await repository.health()).toBe(true)
    await pool.end()
  })

  it('round-trips manual scores above the 32-bit integer range', async () => {
    const { pool, repository } = await createRepository()
    const payload = completedGame({ id: '10000000-0000-4000-8000-000000000023' })
    payload.players[0].scores.pair = 3_000_000_000
    const game = validateCompletedGame(payload)

    await repository.saveGame(game)
    const stored = await repository.getGame(game.id)
    const leaderboard = await repository.getLeaderboard({ mode: 'standard', limit: 20 })

    expect(stored.players[0].total).toBe(3_000_000_000)
    expect(typeof stored.players[0].total).toBe('number')
    expect(leaderboard[0].bestScore).toBe(3_000_000_000)
    await pool.end()
  })
})
