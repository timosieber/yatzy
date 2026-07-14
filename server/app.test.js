// @vitest-environment node
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { MemoryGameRepository } from './repositories/memoryRepository.js'
import { completedGame } from './test/fixtures.js'

describe('game API', () => {
  let repository
  let app

  beforeEach(() => {
    repository = new MemoryGameRepository()
    app = createApp({ repository, serveClient: false })
  })

  it('reports process and persistence health', async () => {
    const response = await request(app).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ status: 'ready', database: 'ready' })
  })

  it('recalculates and stores a complete game idempotently', async () => {
    const payload = completedGame()
    payload.players[0].scores.pair = 12

    const first = await request(app).post('/api/games').send(payload)
    const retry = await request(app).post('/api/games').send(payload)

    expect(first.status).toBe(201)
    expect(first.body.game.players[0].total).toBe(12)
    expect(retry.status).toBe(200)
    expect(await repository.countGames()).toBe(1)
  })

  it('rejects impossible scores with a stable error envelope', async () => {
    const payload = completedGame()
    payload.players[0].scores.pair = 11

    const response = await request(app).post('/api/games').send(payload)

    expect(response.status).toBe(422)
    expect(response.body).toEqual({ error: { code: 'INVALID_SCORE', message: expect.any(String) } })
  })

  it('lists recent games, details, and leaderboards', async () => {
    await request(app).post('/api/games').send(completedGame())

    const history = await request(app).get('/api/games?limit=10')
    const detail = await request(app).get('/api/games/10000000-0000-4000-8000-000000000001')
    const leaderboard = await request(app).get('/api/leaderboard?mode=standard')

    expect(history.body.games).toHaveLength(1)
    expect(detail.body.game.id).toBe('10000000-0000-4000-8000-000000000001')
    expect(leaderboard.body.players[0]).toMatchObject({ gamesPlayed: 1 })
  })

  it('returns structured errors for missing resources and malformed JSON data', async () => {
    const missing = await request(app).get('/api/games/20000000-0000-4000-8000-000000000001')
    const invalid = await request(app).post('/api/games').send({ mode: 'unknown' })

    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.code).toBe('INVALID_REQUEST')
  })
})
