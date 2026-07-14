import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchGame, fetchGames, fetchLeaderboard, submitGame } from './client.js'

function response(body, ok = true, status = 200) {
  return { ok, status, json: vi.fn().mockResolvedValue(body) }
}

describe('API client', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))

  it('submits completed games as JSON', async () => {
    fetch.mockResolvedValue(response({ game: { id: 'game-1' } }, true, 201))

    await expect(submitGame({ id: 'game-1' })).resolves.toEqual({ id: 'game-1' })
    expect(fetch).toHaveBeenCalledWith('/api/games', expect.objectContaining({ method: 'POST', body: '{"id":"game-1"}' }))
  })

  it('loads history, one game, and a mode leaderboard', async () => {
    fetch
      .mockResolvedValueOnce(response({ games: [{ id: 'one' }], nextCursor: null }))
      .mockResolvedValueOnce(response({ game: { id: 'one' } }))
      .mockResolvedValueOnce(response({ players: [{ playerName: 'Mara' }] }))

    await expect(fetchGames({ limit: 10 })).resolves.toMatchObject({ games: [{ id: 'one' }] })
    await expect(fetchGame('one')).resolves.toEqual({ id: 'one' })
    await expect(fetchLeaderboard('maxi')).resolves.toEqual([{ playerName: 'Mara' }])
    expect(fetch.mock.calls.map(call => call[0])).toEqual([
      '/api/games?limit=10',
      '/api/games/one',
      '/api/leaderboard?mode=maxi&limit=100',
    ])
  })

  it('turns API envelopes into readable errors', async () => {
    fetch.mockResolvedValue(response({ error: { code: 'UNAVAILABLE', message: 'Datenbank nicht erreichbar.' } }, false, 503))

    await expect(fetchGames()).rejects.toMatchObject({ message: 'Datenbank nicht erreichbar.', code: 'UNAVAILABLE', status: 503 })
  })
})
