import { z } from 'zod'
import { getCategories, getMode, MODE_KEYS } from '../src/domain/modes.js'
import { isValidScore, rankPlayers } from '../src/domain/scoring.js'

export class GameValidationError extends Error {
  constructor(code, message, status = 422) {
    super(message)
    this.name = 'GameValidationError'
    this.code = code
    this.status = status
  }
}

const rawGameSchema = z.object({
  id: z.string().uuid(),
  mode: z.enum(MODE_KEYS),
  config: z.object({
    dice: z.number().int().min(5).max(8),
    upperTarget: z.number().int().min(0).max(168),
    upperTargetCount: z.number().int().min(2).max(8).optional(),
    bonusValue: z.number().int().min(0).max(100),
    categoryVersion: z.literal(2),
  }),
  completedAt: z.string().datetime(),
  players: z.array(z.object({
    seat: z.number().int().min(0).max(7),
    name: z.string(),
    scores: z.record(z.string(), z.number().int()),
    total: z.number().optional(),
    rank: z.number().optional(),
  })).min(2).max(8),
  locker: z.boolean().optional(),
})

export function normalizeName(value) {
  const display = String(value).normalize('NFKC').trim().replace(/\s+/gu, ' ')
  if (!display || display.length > 40) throw new GameValidationError('INVALID_NAME', 'Spielernamen müssen 1 bis 40 Zeichen lang sein.', 400)
  return { display, key: display.toLocaleLowerCase('de-CH') }
}

export function validateCompletedGame(input) {
  const parsed = rawGameSchema.safeParse(input)
  if (!parsed.success) throw new GameValidationError('INVALID_REQUEST', 'Die Spieldaten sind unvollständig oder falsch formatiert.', 400)
  const payload = parsed.data
  const config = getMode(payload.mode, payload.mode === 'free' ? payload.config : {})

  if (payload.config.dice !== config.dice || payload.config.upperTarget !== config.upperTarget || payload.config.bonusValue !== config.bonusValue) {
    throw new GameValidationError('INVALID_CONFIG', 'Die Spielkonfiguration passt nicht zum gewählten Modus.', 400)
  }
  const completedAt = new Date(payload.completedAt)
  if (completedAt.getTime() > Date.now() + 86_400_000) {
    throw new GameValidationError('INVALID_DATE', 'Das Abschlussdatum liegt zu weit in der Zukunft.', 400)
  }

  const seats = payload.players.map(player => player.seat).sort((a, b) => a - b)
  if (seats.some((seat, index) => seat !== index)) throw new GameValidationError('INVALID_PLAYERS', 'Die Sitzreihenfolge ist ungültig.', 400)
  const names = payload.players.map(player => normalizeName(player.name))
  if (new Set(names.map(name => name.key)).size !== names.length) {
    throw new GameValidationError('DUPLICATE_PLAYER', 'Spielernamen müssen innerhalb einer Runde eindeutig sein.', 400)
  }

  const categories = getCategories(config)
  const expectedKeys = categories.map(category => category.key).sort()
  const players = payload.players.map((player, index) => {
    const receivedKeys = Object.keys(player.scores).sort()
    if (receivedKeys.length !== expectedKeys.length || receivedKeys.some((key, keyIndex) => key !== expectedKeys[keyIndex])) {
      throw new GameValidationError('INCOMPLETE_GAME', `${names[index].display}: Der Spielblock ist nicht vollständig.`)
    }
    for (const category of categories) {
      if (!isValidScore(category, player.scores[category.key], config)) {
        throw new GameValidationError('INVALID_SCORE', `${names[index].display}: ${player.scores[category.key]} ist für „${category.label}“ ungültig.`)
      }
    }
    return { name: names[index].display, playerKey: names[index].key, scores: { ...player.scores } }
  })

  let ranked
  try {
    ranked = rankPlayers(players, config)
  } catch (error) {
    if (error instanceof RangeError) throw new GameValidationError('INVALID_SCORE', 'Die Punktesumme ist zu gross.')
    throw error
  }
  const canonicalPlayers = payload.players.map((player, index) => {
    const result = ranked.find(item => item.seat === index)
    return {
      seat: index,
      name: players[index].name,
      playerKey: players[index].playerKey,
      scores: players[index].scores,
      upperTotal: result.upper,
      bonus: result.bonus,
      lowerTotal: result.lower,
      total: result.total,
      rank: result.rank,
    }
  })

  return {
    id: payload.id,
    mode: payload.mode,
    config: {
      dice: config.dice,
      upperTarget: config.upperTarget,
      upperTargetCount: config.upperTargetCount,
      bonusValue: config.bonusValue,
      categoryVersion: 2,
    },
    completedAt: completedAt.toISOString(),
    players: canonicalPlayers,
    locker: payload.locker === true,
  }
}

export async function getLeaderboard(repository, options) {
  return repository.getLeaderboard(options)
}
