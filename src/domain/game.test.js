import { describe, expect, it } from 'vitest'
import { getMode, getCategories } from './modes.js'
import { createGame, gameReducer, toSubmission } from './game.js'

function completeScores(config, value = 0) {
  return Object.fromEntries(getCategories(config).map(category => [category.key, value]))
}

describe('game reducer', () => {
  it('advances to the next seat regardless of category', () => {
    const game = createGame(getMode('standard'), ['Mara', 'Timo'], '00000000-0000-4000-8000-000000000001')
    const next = gameReducer(game, { type: 'score', playerIndex: 0, category: 'ones', value: 3 })

    expect(next.activePlayer).toBe(1)
    expect(next.players[0].scores.ones).toBe(3)
  })

  it('rejects an entry for a different player or impossible value', () => {
    const game = createGame(getMode('standard'), ['Mara', 'Timo'])

    expect(() => gameReducer(game, { type: 'score', playerIndex: 1, category: 'ones', value: 3 })).toThrow(/nicht am zug/i)
    expect(() => gameReducer(game, { type: 'score', playerIndex: 0, category: 'fullHouse', value: 24 })).toThrow(/ungültig/i)
  })

  it('correction keeps the active turn and can be undone', () => {
    const game = createGame(getMode('standard'), ['Mara', 'Timo'])
    const started = gameReducer(game, { type: 'score', playerIndex: 0, category: 'ones', value: 3 })
    const corrected = gameReducer(started, { type: 'correct', playerIndex: 0, category: 'ones', value: 4 })
    const restored = gameReducer(corrected, { type: 'undo' })

    expect(corrected.activePlayer).toBe(1)
    expect(corrected.players[0].scores.ones).toBe(4)
    expect(restored.players[0].scores.ones).toBe(3)
    expect(restored.activePlayer).toBe(1)
  })

  it('finishes only after every player filled every category', () => {
    const config = getMode('blitz')
    const game = createGame(config, ['Mara', 'Timo'])
    const almostDone = {
      ...game,
      players: [
        { ...game.players[0], scores: completeScores(config) },
        { ...game.players[1], scores: { ...completeScores(config), chance: undefined } },
      ],
      activePlayer: 1,
    }
    delete almostDone.players[1].scores.chance

    const finished = gameReducer(almostDone, { type: 'score', playerIndex: 1, category: 'chance', value: 5 })

    expect(finished.status).toBe('finished')
    expect(toSubmission(finished).players).toHaveLength(2)
  })
})
