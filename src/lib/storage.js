import { getMode } from '../domain/modes.js'

export const STORAGE_KEY = 'yatzy:v2'
export const LEGACY_STORAGE_KEY = 'yatzy:v1'

export function defaultPersistedState() {
  return {
    version: 2,
    theme: 'light',
    setup: { mode: 'standard', names: ['Mara', 'Timo'] },
    activeGame: null,
    queue: [],
  }
}

function migrateScores(scores = {}) {
  const next = { ...scores }
  if (next.fullHouse) next.fullHouse = 25
  if (next.smallStraight) next.smallStraight = 30
  if (next.largeStraight) next.largeStraight = 40
  if (next.yatzy) next.yatzy = Math.max(0, Math.floor(next.yatzy / 50) * 50)
  return next
}

function migratePlayers(players = []) {
  return players.map(player => ({ ...player, scores: migrateScores(player.scores) }))
}

function currentConfig(config = {}, mode) {
  const key = config.key ?? mode ?? 'standard'
  const overrides = key === 'free' ? {
    dice: config.dice,
    upperTargetCount: config.upperTargetCount,
    bonusValue: config.bonusValue,
  } : {}
  return getMode(key, overrides)
}

function migrateActiveGame(game) {
  if (!game) return null
  const config = currentConfig(game.config)
  return {
    ...game,
    config,
    players: migratePlayers(game.players),
    history: (game.history ?? []).map(item => ({ ...item, players: migratePlayers(item.players) })),
  }
}

function migrateSubmission(game) {
  const config = currentConfig(game.config, game.mode)
  return {
    ...game,
    config: {
      dice: config.dice,
      upperTarget: config.upperTarget,
      upperTargetCount: config.upperTargetCount,
      bonusValue: config.bonusValue,
      categoryVersion: 2,
    },
    players: migratePlayers(game.players),
  }
}

export function migratePersistedState(value) {
  const defaults = defaultPersistedState()
  return {
    ...defaults,
    ...value,
    version: 2,
    setup: { ...defaults.setup, ...value.setup },
    activeGame: migrateActiveGame(value.activeGame),
    queue: (value.queue ?? []).map(migrateSubmission),
  }
}

export function loadPersistedState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY) ?? storage?.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return defaultPersistedState()
    const value = JSON.parse(raw)
    if (!Array.isArray(value?.queue)) return defaultPersistedState()
    if (value.version === 2) return value
    if (value.version !== 1) return defaultPersistedState()
    const migrated = migratePersistedState(value)
    storage?.setItem(STORAGE_KEY, JSON.stringify(migrated))
    storage?.removeItem(LEGACY_STORAGE_KEY)
    return migrated
  } catch {
    return defaultPersistedState()
  }
}

export function persistState(storage = globalThis.localStorage, value) {
  storage?.setItem(STORAGE_KEY, JSON.stringify({ ...value, version: 2 }))
  storage?.removeItem(LEGACY_STORAGE_KEY)
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
