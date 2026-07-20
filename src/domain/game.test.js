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

describe('locker mode', () => {
  it('sets game.locker to true via createGame options', () => {
    const game = createGame(getMode('standard'), ['Mara', 'Timo'], undefined, { locker: true })

    expect(game.locker).toBe(true)
  })

  it('defaults game.locker to false when no options are given', () => {
    const game = createGame(getMode('standard'), ['Mara', 'Timo'])

    expect(game.locker).toBe(false)
  })

  it('allows "set" for any playerIndex without turn order and does not auto-finish', () => {
    const config = getMode('blitz')
    const game = createGame(config, ['Mara', 'Timo'], undefined, { locker: true })
    const almostDone = {
      ...game,
      players: [
        { ...game.players[0], scores: completeScores(config) },
        { ...game.players[1], scores: completeScores(config) },
      ],
    }
    delete almostDone.players[1].scores.chance

    const next = gameReducer(almostDone, { type: 'set', playerIndex: 1, category: 'chance', value: 5 })

    expect(next.players[1].scores.chance).toBe(5)
    expect(next.activePlayer).toBe(almostDone.activePlayer)
    expect(next.status).toBe('active')
  })

  it('rejects an invalid value for "set"', () => {
    const game = createGame(getMode('standard'), ['Mara', 'Timo'], undefined, { locker: true })

    expect(() => gameReducer(game, { type: 'set', playerIndex: 0, category: 'fullHouse', value: 24 })).toThrow(/ungültig/i)
  })

  it('"clear" removes a value and can be restored with undo', () => {
    const game = createGame(getMode('standard'), ['Mara', 'Timo'], undefined, { locker: true })
    const withValue = gameReducer(game, { type: 'set', playerIndex: 0, category: 'ones', value: 3 })
    const cleared = gameReducer(withValue, { type: 'clear', playerIndex: 0, category: 'ones' })

    expect(cleared.players[0].scores.ones).toBeUndefined()

    const restored = gameReducer(cleared, { type: 'undo' })

    expect(restored.players[0].scores.ones).toBe(3)
  })

  it('"setActive" changes the active player', () => {
    const game = createGame(getMode('standard'), ['Mara', 'Timo'], undefined, { locker: true })
    const next = gameReducer(game, { type: 'setActive', playerIndex: 1 })

    expect(next.activePlayer).toBe(1)
  })

  it('"finish" marks the game as finished and toSubmission fills empty cells with 0', () => {
    const config = getMode('standard')
    const game = createGame(config, ['Mara', 'Timo'], undefined, { locker: true })
    const withSomeScores = gameReducer(game, { type: 'set', playerIndex: 0, category: 'ones', value: 3 })
    const finished = gameReducer(withSomeScores, { type: 'finish' })

    expect(finished.status).toBe('finished')

    const submission = toSubmission(finished)

    expect(submission.locker).toBe(true)
    getCategories(config).forEach(category => {
      submission.players.forEach(player => {
        expect(player.scores[category.key]).toBeTypeOf('number')
      })
    })
    expect(submission.players[0].scores.ones).toBe(3)
  })

  it('rejects locker-only actions for a non-locker game', () => {
    const game = createGame(getMode('standard'), ['Mara', 'Timo'])

    expect(() => gameReducer(game, { type: 'set', playerIndex: 0, category: 'ones', value: 3 })).toThrow()
    expect(() => gameReducer(game, { type: 'clear', playerIndex: 0, category: 'ones' })).toThrow()
    expect(() => gameReducer(game, { type: 'setActive', playerIndex: 1 })).toThrow()
    expect(() => gameReducer(game, { type: 'finish' })).toThrow()
  })
})
