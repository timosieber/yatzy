const UPPER = [
  ['ones', 'Einser', 1],
  ['twos', 'Zweier', 2],
  ['threes', 'Dreier', 3],
  ['fours', 'Vierer', 4],
  ['fives', 'Fünfer', 5],
  ['sixes', 'Sechser', 6],
].map(([key, label, face]) => ({ key, label, type: 'upper', face, input: 'calculated', section: 'upper' }))

const STANDARD_LOWER = [
  { key: 'pair', label: '1 Paar', type: 'pair', input: 'manual' },
  { key: 'twoPairs', label: '2 Paare', type: 'twoPairs', input: 'manual' },
  { key: 'threeKind', label: '3 gleiche', type: 'kind3', input: 'manual' },
  { key: 'fourKind', label: '4 gleiche', type: 'kind4', input: 'manual' },
  { key: 'fullHouse', label: 'Full House', type: 'fullHouse', fixed: 25, input: 'fixed' },
  { key: 'smallStraight', label: 'Kleine Straße', type: 'smallStraight', fixed: 30, input: 'fixed' },
  { key: 'largeStraight', label: 'Große Straße', type: 'largeStraight', fixed: 40, input: 'fixed' },
  { key: 'yatzy', label: 'Yatzy', type: 'yatzy', fixed: 50, step: 50, input: 'repeat' },
  { key: 'chance', label: 'Chance', type: 'chance', input: 'calculated' },
]

const MAXI_LOWER = [
  { key: 'pair', label: '1 Paar', type: 'pair', input: 'manual' },
  { key: 'twoPairs', label: '2 Paare', type: 'twoPairs', input: 'manual' },
  { key: 'threePairs', label: '3 Paare', type: 'threePairs', input: 'calculated' },
  { key: 'threeKind', label: '3 gleiche', type: 'kind3', input: 'manual' },
  { key: 'fourKind', label: '4 gleiche', type: 'kind4', input: 'manual' },
  { key: 'fiveKind', label: '5 gleiche', type: 'kind5', input: 'calculated' },
  { key: 'tower', label: 'Turm (3 + 3)', type: 'tower', input: 'calculated' },
  { key: 'fullHouse', label: 'Full House', type: 'fullHouse', fixed: 25, input: 'fixed' },
  { key: 'fullStraight', label: 'Volle Straße', type: 'fullStraight', fixed: 21, input: 'fixed' },
  { key: 'smallStraight', label: 'Kleine Straße', type: 'smallStraight', fixed: 30, input: 'fixed' },
  { key: 'largeStraight', label: 'Große Straße', type: 'largeStraight', fixed: 40, input: 'fixed' },
  { key: 'yatzy', label: 'Yatzy', type: 'yatzy', fixed: 50, step: 50, input: 'repeat' },
  { key: 'chance', label: 'Chance', type: 'chance', input: 'calculated' },
]

const MODE_TEMPLATES = {
  standard: {
    key: 'standard', label: 'Standard', subtitle: '5 Würfel, klassischer Spielblock',
    dice: 5, upperTarget: 63, bonusValue: 35, lower: STANDARD_LOWER,
  },
  blitz: {
    key: 'blitz', label: 'Blitz', subtitle: 'Oben, Yatzy und Chance',
    dice: 5, upperTarget: 63, bonusValue: 35,
    lower: [STANDARD_LOWER.find(category => category.key === 'yatzy'), STANDARD_LOWER.find(category => category.key === 'chance')],
  },
  maxi: {
    key: 'maxi', label: 'Maxi Yatzy', subtitle: '6 Würfel, zusätzliche Kategorien',
    dice: 6, upperTarget: 84, bonusValue: 100, lower: MAXI_LOWER,
  },
  free: {
    key: 'free', label: 'Freie Regeln', subtitle: 'Würfel und Bonus selbst festlegen',
    dice: 7, upperTarget: 63, upperTargetCount: 3, bonusValue: 35, lower: STANDARD_LOWER,
  },
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

export const MODE_KEYS = Object.freeze(Object.keys(MODE_TEMPLATES))

export function getMode(key, overrides = {}) {
  const template = MODE_TEMPLATES[key]
  if (!template) throw new Error(`Unbekannter Spielmodus: ${key}`)

  const dice = key === 'free' ? Math.min(8, Math.max(5, Number(overrides.dice ?? template.dice))) : template.dice
  const upperTargetCount = key === 'free'
    ? Math.min(dice, Math.max(2, Number(overrides.upperTargetCount ?? template.upperTargetCount)))
    : undefined
  const bonusValue = key === 'free'
    ? Math.min(100, Math.max(0, Number(overrides.bonusValue ?? template.bonusValue)))
    : template.bonusValue

  return deepFreeze({
    ...template,
    categoryVersion: 2,
    dice,
    upperTargetCount,
    upperTarget: key === 'free' ? upperTargetCount * 21 : template.upperTarget,
    bonusValue,
    upper: UPPER.map(category => ({ ...category })),
    lower: template.lower.map(category => ({ ...category, section: 'lower' })),
  })
}

export function getCategories(config) {
  return [...config.upper, ...config.lower]
}
