import { describe, expect, it } from 'vitest'
import { getMode } from './modes.js'
import { calculatePlayer, isValidScore, rankPlayers, validScores } from './scoring.js'

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

  it('accepts arbitrary nonnegative integers in the four manual categories', () => {
    const config = getMode('standard')
    for (const key of ['pair', 'twoPairs', 'threeKind', 'fourKind']) {
      const category = config.lower.find(item => item.key === key)
      expect(category.input).toBe('manual')
      expect(isValidScore(category, 137, config)).toBe(true)
      expect(isValidScore(category, -1, config)).toBe(false)
      expect(isValidScore(category, 1.5, config)).toBe(false)
    }
  })

  it('uses the fixed house-rule values in every mode', () => {
    for (const mode of ['standard', 'maxi', 'free']) {
      const config = getMode(mode)
      expect(validScores(config.lower.find(item => item.key === 'fullHouse'), config)).toEqual([0, 25])
      expect(validScores(config.lower.find(item => item.key === 'smallStraight'), config)).toEqual([0, 30])
      expect(validScores(config.lower.find(item => item.key === 'largeStraight'), config)).toEqual([0, 40])
    }
    const maxi = getMode('maxi')
    expect(validScores(maxi.lower.find(item => item.key === 'fullStraight'), maxi)).toEqual([0, 21])
  })

  it('accepts cumulative Yatzys in 50-point steps in every mode', () => {
    for (const mode of ['standard', 'blitz', 'maxi', 'free']) {
      const config = getMode(mode)
      const yatzy = config.lower.find(item => item.key === 'yatzy')
      expect(yatzy).toMatchObject({ input: 'repeat', step: 50, fixed: 50 })
      expect(isValidScore(yatzy, 250, config)).toBe(true)
      expect(isValidScore(yatzy, 275, config)).toBe(false)
    }
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
