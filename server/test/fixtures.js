import { getCategories, getMode } from '../../src/domain/modes.js'

export function completedGame({
  id = '10000000-0000-4000-8000-000000000001',
  mode = 'standard',
  names = ['Mara', 'Timo'],
} = {}) {
  const config = getMode(mode)
  const scores = Object.fromEntries(getCategories(config).map(category => [category.key, 0]))
  return {
    id,
    mode,
    config: {
      dice: config.dice,
      upperTarget: config.upperTarget,
      upperTargetCount: config.upperTargetCount,
      bonusValue: config.bonusValue,
      categoryVersion: config.categoryVersion,
    },
    completedAt: '2026-07-14T12:00:00.000Z',
    players: names.map((name, seat) => ({ seat, name, scores: { ...scores }, total: 999, rank: 9 })),
  }
}
