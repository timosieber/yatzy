import { describe, expect, it, vi } from 'vitest'
import { enqueueSubmission, flushQueue, loadPersistedState, persistState } from './storage.js'

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}

describe('versioned browser storage', () => {
  it('round-trips the active game and preferences', () => {
    const storage = memoryStorage()
    const value = { version: 2, theme: 'dark', setup: { mode: 'maxi' }, activeGame: { id: 'game' }, queue: [] }

    persistState(storage, value)

    expect(loadPersistedState(storage)).toEqual(value)
  })

  it('recovers safely from corrupt data', () => {
    const storage = memoryStorage({ 'yatzy:v2': '{broken' })

    expect(loadPersistedState(storage)).toMatchObject({ version: 2, activeGame: null, queue: [] })
  })

  it('migrates a legacy active game, undo snapshots, and queued submission', () => {
    const legacyScores = { pair: 137, fullHouse: 28, smallStraight: 15, largeStraight: 20, yatzy: 175 }
    const legacy = {
      version: 1,
      theme: 'light',
      setup: { mode: 'standard', names: ['Mara', 'Timo'] },
      activeGame: {
        id: 'game-legacy',
        config: { key: 'standard', dice: 5, upperTarget: 63, bonusValue: 35 },
        players: [{ id: 'mara', name: 'Mara', scores: legacyScores }],
        history: [{ players: [{ id: 'mara', name: 'Mara', scores: legacyScores }], activePlayer: 0, status: 'active' }],
      },
      queue: [{
        id: 'queued-legacy', mode: 'standard', config: { dice: 5, upperTarget: 63, bonusValue: 35, categoryVersion: 1 },
        players: [{ seat: 0, name: 'Mara', scores: legacyScores }],
      }],
    }
    const storage = memoryStorage({ 'yatzy:v1': JSON.stringify(legacy) })

    const migrated = loadPersistedState(storage)

    expect(migrated.version).toBe(2)
    expect(migrated.activeGame.config.categoryVersion).toBe(2)
    expect(migrated.activeGame.players[0].scores).toMatchObject({
      pair: 137, fullHouse: 25, smallStraight: 30, largeStraight: 40, yatzy: 150,
    })
    expect(migrated.activeGame.history[0].players[0].scores.fullHouse).toBe(25)
    expect(migrated.queue[0].config.categoryVersion).toBe(2)
    expect(migrated.queue[0].players[0].scores.yatzy).toBe(150)
  })

  it('keeps a failed completed game queued', async () => {
    const storage = memoryStorage()
    enqueueSubmission(storage, { id: 'game-1' })
    const submit = vi.fn().mockRejectedValue(new Error('offline'))

    const result = await flushQueue(storage, submit)

    expect(result.queue).toEqual([{ id: 'game-1' }])
    expect(submit).toHaveBeenCalledOnce()
  })

  it('removes successful submissions and de-duplicates ids', async () => {
    const storage = memoryStorage()
    enqueueSubmission(storage, { id: 'game-1' })
    enqueueSubmission(storage, { id: 'game-1' })

    const result = await flushQueue(storage, vi.fn().mockResolvedValue({ id: 'game-1' }))

    expect(result.queue).toEqual([])
  })
})
