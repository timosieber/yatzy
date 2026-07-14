// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getLeaderboard, normalizeName, validateCompletedGame } from './gameService.js'
import { MemoryGameRepository } from './repositories/memoryRepository.js'
import { completedGame } from './test/fixtures.js'

describe('completed game validation', () => {
  it('normalizes player identity while preserving display spelling', () => {
    expect(normalizeName('  TÍMO   Sieber  ')).toEqual({ display: 'TÍMO Sieber', key: 'tímo sieber' })
  })

  it('recalculates client supplied totals and ranks', () => {
    const payload = completedGame()
    payload.players[0].scores.pair = 12

    const result = validateCompletedGame(payload)

    expect(result.players[0]).toMatchObject({ total: 12, rank: 1, upperTotal: 0, lowerTotal: 12 })
    expect(result.players[1]).toMatchObject({ total: 0, rank: 2 })
  })

  it('rejects incomplete and impossible scores', () => {
    const impossible = completedGame()
    impossible.players[0].scores.fullHouse = 24
    expect(() => validateCompletedGame(impossible)).toThrow(/ungültig/i)

    const incomplete = completedGame()
    delete incomplete.players[0].scores.chance
    expect(() => validateCompletedGame(incomplete)).toThrow(/vollständig/i)
  })

  it('accepts manual scores and cumulative Yatzys but rejects invalid fixed scores', () => {
    const payload = completedGame()
    payload.players[0].scores.pair = 137
    payload.players[0].scores.yatzy = 150

    const result = validateCompletedGame(payload)

    expect(result.players[0].lowerTotal).toBe(287)
    payload.players[0].scores.fullHouse = 24
    expect(() => validateCompletedGame(payload)).toThrow(/ungültig/i)
  })
})

describe('leaderboard aggregation', () => {
  it('merges names case-insensitively and keeps the latest spelling', async () => {
    const repository = new MemoryGameRepository()
    const first = validateCompletedGame(completedGame({ id: '10000000-0000-4000-8000-000000000011', names: ['Timo', 'Mara'] }))
    const secondPayload = completedGame({ id: '10000000-0000-4000-8000-000000000012', names: ['timo', 'Noah'] })
    secondPayload.completedAt = '2026-07-14T13:00:00.000Z'
    secondPayload.players[0].scores.yatzy = 50
    const second = validateCompletedGame(secondPayload)
    await repository.saveGame(first)
    await repository.saveGame(second)

    const rows = await getLeaderboard(repository, { mode: 'standard', limit: 20 })

    expect(rows[0]).toMatchObject({ playerName: 'timo', bestScore: 50, gamesPlayed: 2, wins: 2 })
  })
})
