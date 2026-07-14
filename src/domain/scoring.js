import { getCategories } from './modes.js'

const scoreCache = new Map()
const distributionCache = new Map()

function distributions(dice) {
  if (distributionCache.has(dice)) return distributionCache.get(dice)
  const result = []
  const counts = Array(6).fill(0)

  function visit(face, remaining) {
    if (face === 5) {
      counts[face] = remaining
      result.push([...counts])
      return
    }
    for (let count = 0; count <= remaining; count += 1) {
      counts[face] = count
      visit(face + 1, remaining - count)
    }
  }

  visit(0, dice)
  distributionCache.set(dice, result)
  return result
}

function qualifyingFaces(counts, minimum) {
  return counts
    .map((count, index) => ({ count, face: index + 1 }))
    .filter(item => item.count >= minimum)
    .sort((a, b) => b.face - a.face)
}

export function scoreDistribution(category, counts, dice) {
  if (category.type === 'upper') return counts[category.face - 1] * category.face
  if (category.type === 'pair') return (qualifyingFaces(counts, 2)[0]?.face ?? 0) * 2
  if (category.type === 'twoPairs') {
    const pairs = qualifyingFaces(counts, 2).slice(0, 2)
    return pairs.length === 2 ? pairs.reduce((sum, pair) => sum + pair.face * 2, 0) : 0
  }
  if (category.type === 'threePairs') {
    const pairs = qualifyingFaces(counts, 2).slice(0, 3)
    return pairs.length === 3 ? pairs.reduce((sum, pair) => sum + pair.face * 2, 0) : 0
  }
  if (category.type.startsWith('kind')) {
    const size = Number(category.type.slice(4))
    return (qualifyingFaces(counts, size)[0]?.face ?? 0) * size
  }
  if (category.type === 'fullHouse') {
    const triples = qualifyingFaces(counts, 3)
    for (const triple of triples) {
      const pair = qualifyingFaces(counts, 2).find(item => item.face !== triple.face)
      if (pair) return category.fixed ?? (triple.face * 3 + pair.face * 2)
    }
    return 0
  }
  if (category.type === 'tower') {
    const triples = qualifyingFaces(counts, 3).slice(0, 2)
    return triples.length === 2 ? triples.reduce((sum, triple) => sum + triple.face * 3, 0) : 0
  }
  if (category.type === 'smallStraight') return counts.slice(0, 5).every(Boolean) ? category.fixed : 0
  if (category.type === 'largeStraight') return counts.slice(1, 6).every(Boolean) ? category.fixed : 0
  if (category.type === 'fullStraight') return counts.every(Boolean) ? category.fixed : 0
  if (category.type === 'yatzy') return counts.some(count => count === dice) ? category.fixed : 0
  if (category.type === 'chance') return counts.reduce((sum, count, index) => sum + count * (index + 1), 0)
  return 0
}

export function validScores(category, config) {
  if (!category) return [0]
  const cacheKey = `${config.dice}:${category.type}:${category.face ?? ''}:${category.fixed ?? ''}`
  if (!scoreCache.has(cacheKey)) {
    const scores = new Set([0])
    distributions(config.dice).forEach(counts => scores.add(scoreDistribution(category, counts, config.dice)))
    scoreCache.set(cacheKey, [...scores].sort((a, b) => a - b))
  }
  return scoreCache.get(cacheKey)
}

export function isValidScore(category, value, config) {
  if (!Number.isSafeInteger(value) || value < 0) return false
  if (category.input === 'manual') return true
  if (category.input === 'repeat') return value % category.step === 0
  return validScores(category, config).includes(value)
}

export function calculatePlayer(scores, config) {
  const upper = config.upper.reduce((sum, category) => sum + (scores[category.key] ?? 0), 0)
  const lower = config.lower.reduce((sum, category) => sum + (scores[category.key] ?? 0), 0)
  const upperComplete = config.upper.every(category => scores[category.key] !== undefined)
  const complete = getCategories(config).every(category => scores[category.key] !== undefined)
  const bonus = upperComplete && upper >= config.upperTarget ? config.bonusValue : 0
  const total = upper + lower + bonus
  if (![upper, lower, bonus, total].every(Number.isSafeInteger)) throw new RangeError('Die Punktesumme ist zu gross.')
  return { upper, lower, bonus, total, complete }
}

export function rankPlayers(players, config) {
  const ranked = players
    .map((player, seat) => ({ ...player, seat, ...calculatePlayer(player.scores, config) }))
    .sort((a, b) => b.total - a.total || a.seat - b.seat)

  let previousTotal
  let previousRank
  return ranked.map((player, index) => {
    const rank = index > 0 && previousTotal === player.total ? previousRank : index + 1
    previousTotal = player.total
    previousRank = rank
    return { ...player, rank }
  })
}
