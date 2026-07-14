export const STORAGE_KEY = 'yatzy:v1'

export function defaultPersistedState() {
  return {
    version: 1,
    theme: 'light',
    setup: { mode: 'standard', names: ['Mara', 'Timo'] },
    activeGame: null,
    queue: [],
  }
}

export function loadPersistedState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return defaultPersistedState()
    const value = JSON.parse(raw)
    if (value?.version !== 1 || !Array.isArray(value.queue)) return defaultPersistedState()
    return value
  } catch {
    return defaultPersistedState()
  }
}

export function persistState(storage = globalThis.localStorage, value) {
  storage?.setItem(STORAGE_KEY, JSON.stringify({ ...value, version: 1 }))
  return value
}

export function enqueueSubmission(storage = globalThis.localStorage, game) {
  const state = loadPersistedState(storage)
  if (!state.queue.some(item => item.id === game.id)) state.queue.push(game)
  persistState(storage, state)
  return state
}

export async function flushQueue(storage = globalThis.localStorage, submit) {
  const state = loadPersistedState(storage)
  const remaining = []
  for (let index = 0; index < state.queue.length; index += 1) {
    const game = state.queue[index]
    try {
      await submit(game)
    } catch {
      remaining.push(...state.queue.slice(index))
      break
    }
  }
  const next = { ...state, queue: remaining }
  persistState(storage, next)
  return next
}
