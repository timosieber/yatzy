import { getCategories } from './modes.js'
import { calculatePlayer, isValidScore, rankPlayers } from './scoring.js'

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `game-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function snapshot(state) {
  return {
    players: state.players.map(player => ({ ...player, scores: { ...player.scores } })),
    activePlayer: state.activePlayer,
    status: state.status,
    completedAt: state.completedAt ?? null,
  }
}

function withHistory(state) {
  return [...state.history, snapshot(state)].slice(-100)
}

function findCategory(config, key) {
  return getCategories(config).find(category => category.key === key)
}

function isComplete(players, config) {
  return players.every(player => calculatePlayer(player.scores, config).complete)
}

export function createGame(config, names, id = createId(), { locker = false } = {}) {
  if (!Array.isArray(names) || names.length < 2 || names.length > 8) throw new Error('Es sind 2 bis 8 Spieler erforderlich.')
  return {
    id,
    config,
    players: names.map((name, index) => ({ id: `${id}:${index}`, name, scores: {} })),
    activePlayer: 0,
    history: [],
    status: 'active',
    startedAt: new Date().toISOString(),
    completedAt: null,
    locker: locker === true,
  }
}

const LOCKER_ACTION_TYPES = ['set', 'clear', 'setActive', 'finish']

function lockerReducer(state, action) {
  if (action.type === 'setActive') {
    if (!Number.isInteger(action.playerIndex) || !state.players[action.playerIndex]) throw new Error('Unbekannter Spieler.')
    return { ...state, activePlayer: action.playerIndex, history: state.history }
  }

  if (action.type === 'finish') {
    return { ...state, status: 'finished', completedAt: state.completedAt ?? new Date().toISOString(), history: state.history }
  }

  if (!Number.isInteger(action.playerIndex) || !state.players[action.playerIndex]) throw new Error('Unbekannter Spieler.')

  if (action.type === 'clear') {
    const players = state.players.map((player, index) => {
      if (index !== action.playerIndex) return player
      const scores = { ...player.scores }
      delete scores[action.category]
      return { ...player, scores }
    })
    return { ...state, players, history: withHistory(state) }
  }

  // action.type === 'set'
  const category = findCategory(state.config, action.category)
  if (!category) throw new Error('Unbekannte Kategorie.')
  if (!isValidScore(category, action.value, state.config)) throw new Error('Diese Punktzahl ist für die Kategorie ungültig.')
  const players = state.players.map((player, index) => index === action.playerIndex
    ? { ...player, scores: { ...player.scores, [action.category]: action.value } }
    : player)
  return { ...state, players, history: withHistory(state) }
}

export function gameReducer(state, action) {
  if (action.type === 'undo') {
    const previous = state.history.at(-1)
    if (!previous) return state
    return { ...state, ...previous, history: state.history.slice(0, -1) }
  }

  if (LOCKER_ACTION_TYPES.includes(action.type)) {
    if (state.locker !== true) throw new Error('Dieser Aktionstyp ist nur im lockeren Modus erlaubt.')
    return lockerReducer(state, action)
  }

  if (!['score', 'correct'].includes(action.type)) return state
  const category = findCategory(state.config, action.category)
  if (!category) throw new Error('Unbekannte Kategorie.')
  if (!isValidScore(category, action.value, state.config)) throw new Error('Diese Punktzahl ist für die Kategorie ungültig.')
  if (!Number.isInteger(action.playerIndex) || !state.players[action.playerIndex]) throw new Error('Unbekannter Spieler.')

  if (action.type === 'score') {
    if (state.status !== 'active') throw new Error('Dieses Spiel ist bereits beendet.')
    if (action.playerIndex !== state.activePlayer) throw new Error('Dieser Spieler ist nicht am Zug.')
    if (state.players[action.playerIndex].scores[action.category] !== undefined) throw new Error('Diese Kategorie ist bereits ausgefüllt.')
  } else if (state.players[action.playerIndex].scores[action.category] === undefined) {
    throw new Error('Nur eingetragene Werte können korrigiert werden.')
  }

  const players = state.players.map((player, index) => index === action.playerIndex
    ? { ...player, scores: { ...player.scores, [action.category]: action.value } }
    : player)
  const completed = isComplete(players, state.config)

  return {
    ...state,
    players,
    activePlayer: action.type === 'score' ? (state.activePlayer + 1) % players.length : state.activePlayer,
    history: withHistory(state),
    status: completed ? 'finished' : 'active',
    completedAt: completed ? (state.completedAt ?? new Date().toISOString()) : null,
  }
}

export function toSubmission(game) {
  if (game.status !== 'finished') throw new Error('Nur vollständige Spiele können gespeichert werden.')
  const ranked = rankPlayers(game.players, game.config)
  const categoryKeys = getCategories(game.config).map(category => category.key)
  return {
    id: game.id,
    mode: game.config.key,
    locker: game.locker === true,
    config: {
      dice: game.config.dice,
      upperTarget: game.config.upperTarget,
      upperTargetCount: game.config.upperTargetCount,
      bonusValue: game.config.bonusValue,
      categoryVersion: game.config.categoryVersion,
    },
    completedAt: game.completedAt,
    players: game.players.map((player, seat) => {
      const result = ranked.find(item => item.seat === seat)
      const scores = { ...player.scores }
      categoryKeys.forEach(key => {
        if (scores[key] === undefined) scores[key] = 0
      })
      return { seat, name: player.name, scores, total: result.total, rank: result.rank }
    }),
  }
}
