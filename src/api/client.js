export class ApiError extends Error {
  constructor(message, code = 'REQUEST_FAILED', status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function request(url, options = {}) {
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
    })
  } catch {
    throw new ApiError('Der Server ist gerade nicht erreichbar.', 'NETWORK_ERROR', 0)
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(body.error?.message ?? 'Die Anfrage konnte nicht verarbeitet werden.', body.error?.code, response.status)
  }
  return body
}

export async function submitGame(game) {
  const body = await request('/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(game),
  })
  return body.game
}

export async function fetchGames({ limit = 20, cursor } = {}) {
  const parameters = new URLSearchParams({ limit: String(limit) })
  if (cursor) parameters.set('cursor', cursor)
  return request(`/api/games?${parameters}`)
}

export async function fetchGame(id) {
  const body = await request(`/api/games/${encodeURIComponent(id)}`)
  return body.game
}

export async function fetchLeaderboard(mode) {
  const body = await request(`/api/leaderboard?mode=${encodeURIComponent(mode)}&limit=100`)
  return body.players
}
