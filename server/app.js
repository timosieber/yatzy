import compression from 'compression'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { ZodError } from 'zod'
import { GameValidationError, getLeaderboard, validateCompletedGame } from './gameService.js'
import { getMode } from '../src/domain/modes.js'

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response)).catch(next)
}

function parseLimit(value, fallback, maximum) {
  const number = value === undefined ? fallback : Number(value)
  if (!Number.isInteger(number) || number < 1 || number > maximum) {
    throw new GameValidationError('INVALID_REQUEST', `limit muss zwischen 1 und ${maximum} liegen.`, 400)
  }
  return number
}

async function useRepository(operation) {
  try {
    return await operation()
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') console.error(error)
    throw new GameValidationError('DATABASE_UNAVAILABLE', 'Die Spieldatenbank ist vorübergehend nicht erreichbar.', 503)
  }
}

export function createApp({ repository, serveClient = false, staticDirectory } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(compression())
  app.use(express.json({ limit: '64kb' }))
  app.use((request, response, next) => {
    const startedAt = Date.now()
    response.on('finish', () => {
      if (process.env.NODE_ENV === 'test') return
      console.info(JSON.stringify({
        level: 'info', event: 'request', method: request.method, path: request.path,
        status: response.statusCode, durationMs: Date.now() - startedAt,
      }))
    })
    next()
  })

  app.get('/api/health', asyncRoute(async (_request, response) => {
    await useRepository(() => repository.health())
    response.json({ status: 'ready', database: 'ready', timestamp: new Date().toISOString() })
  }))

  app.post('/api/games', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }), asyncRoute(async (request, response) => {
    const game = validateCompletedGame(request.body)
    const saved = await useRepository(() => repository.saveGame(game))
    response.status(saved.created ? 201 : 200).json({ game: saved.game, created: saved.created })
  }))

  app.get('/api/games', asyncRoute(async (request, response) => {
    const result = await useRepository(() => repository.listGames({ limit: parseLimit(request.query.limit, 20, 50), cursor: request.query.cursor }))
    response.json(result)
  }))

  app.get('/api/games/:id', asyncRoute(async (request, response) => {
    const game = await useRepository(() => repository.getGame(request.params.id))
    if (!game) throw new GameValidationError('NOT_FOUND', 'Dieses Spiel wurde nicht gefunden.', 404)
    response.json({ game })
  }))

  app.get('/api/leaderboard', asyncRoute(async (request, response) => {
    try {
      getMode(request.query.mode)
    } catch {
      throw new GameValidationError('INVALID_REQUEST', 'Der Spielmodus ist nicht gültig.', 400)
    }
    const players = await useRepository(() => getLeaderboard(repository, {
      mode: request.query.mode,
      limit: parseLimit(request.query.limit, 50, 100),
    }))
    response.json({ mode: request.query.mode, players })
  }))

  app.use('/api', (_request, _response, next) => next(new GameValidationError('NOT_FOUND', 'API-Endpunkt nicht gefunden.', 404)))

  if (serveClient && staticDirectory) {
    app.use(express.static(staticDirectory, { index: false, maxAge: '1h' }))
    app.use((request, response, next) => {
      if (request.method !== 'GET' || !request.accepts('html')) return next()
      return response.sendFile('index.html', { root: staticDirectory })
    })
  }

  app.use((error, _request, response, _next) => {
    if (error instanceof GameValidationError) {
      return response.status(error.status).json({ error: { code: error.code, message: error.message } })
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return response.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Die Anfrage ist nicht gültig.' } })
    }
    console.error(error)
    return response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Der Server konnte die Anfrage nicht verarbeiten.' } })
  })

  return app
}
