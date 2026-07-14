import { describe, expect, it } from 'vitest'
import { getMode } from './modes.js'
import { calculatePlayer, rankPlayers, validScores } from './scoring.js'

describe('Yatzy scoring', () => {
  it('awards the standard upper bonus at 63 eyes', () => {
    const config = getMode('standard')
    const scores = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 }

    expect(calculatePlayer(scores, config)).toMatchObject({ upper: 63, bonus: 35, total: 98 })
  })

  it('awards the Maxi bonus at 84 eyes', () => {
    const config = getMode('maxi')
    const scores = { ones: 4, twos: 8, threes: 12, fours: 16, fives: 20, sixes: 24 }

    expect(calculatePlayer(scores, config).bonus).toBe(100)
  })

  it('exposes only possible pair scores', () => {
    const config = getMode('standard')
    const pair = config.lower.find(category => category.key === 'pair')

    expect(validScores(pair, config)).toContain(12)
    expect(validScores(pair, config)).not.toContain(11)
  })

  it('accepts only multiples of a face in upper categories', () => {
    const config = getMode('standard')
    const fives = config.upper.find(category => category.key === 'fives')

    expect(validScores(fives, config)).toEqual([0, 5, 10, 15, 20, 25])
  })

  it('gives tied leaders the same rank', () => {
    const config = getMode('blitz')
    const ranked = rankPlayers([
      { name: 'Mara', scores: { yatzy: 50 } },
      { name: 'Timo', scores: { yatzy: 50 } },
      { name: 'Noah', scores: { yatzy: 0 } },
    ], config)

    expect(ranked.map(player => [player.name, player.rank])).toEqual([
      ['Mara', 1],
      ['Timo', 1],
      ['Noah', 3],
    ])
  })

  it('provides all four immutable mode configurations', () => {
    expect(['standard', 'blitz', 'maxi', 'free'].map(key => getMode(key).key)).toEqual([
      'standard', 'blitz', 'maxi', 'free',
    ])
    expect(() => { getMode('standard').dice = 8 }).toThrow()
  })
})
