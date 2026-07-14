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
    const value = { version: 1, theme: 'dark', setup: { mode: 'maxi' }, activeGame: { id: 'game' }, queue: [] }

    persistState(storage, value)

    expect(loadPersistedState(storage)).toEqual(value)
  })

  it('recovers safely from corrupt data', () => {
    const storage = memoryStorage({ 'yatzy:v1': '{broken' })

    expect(loadPersistedState(storage)).toMatchObject({ version: 1, activeGame: null, queue: [] })
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
