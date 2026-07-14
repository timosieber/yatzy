function mapPlayer(row) {
  return {
    seat: row.seat,
    name: row.player_name,
    playerKey: row.player_key,
    scores: row.scores,
    upperTotal: row.upper_total,
    bonus: row.bonus,
    lowerTotal: row.lower_total,
    total: row.total,
    rank: row.rank,
  }
}

function mapGame(row, players) {
  return {
    id: row.id,
    mode: row.mode,
    config: row.config,
    completedAt: new Date(row.completed_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    players,
  }
}

export class PostgresGameRepository {
  constructor(pool) {
    this.pool = pool
  }

  async saveGame(game) {
    const client = await this.pool.connect()
    let created = false
    try {
      await client.query('BEGIN')
      const inserted = await client.query(
        `INSERT INTO games (id, mode, config, completed_at)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [game.id, game.mode, JSON.stringify(game.config), game.completedAt],
      )
      const existingPlayers = await client.query('SELECT 1 FROM game_players WHERE game_id = $1 LIMIT 1', [game.id])
      created = inserted.rowCount === 1 && existingPlayers.rowCount === 0
      if (created) {
        for (const player of game.players) {
          await client.query(
            `INSERT INTO game_players
              (game_id, seat, player_name, player_key, scores, upper_total, bonus, lower_total, total, rank)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)`,
            [game.id, player.seat, player.name, player.playerKey, JSON.stringify(player.scores), player.upperTotal, player.bonus, player.lowerTotal, player.total, player.rank],
          )
        }
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    return { created, game: await this.getGame(game.id) }
  }

  async getGame(id) {
    const gameResult = await this.pool.query('SELECT * FROM games WHERE id = $1', [id])
    if (!gameResult.rowCount) return null
    const playersResult = await this.pool.query('SELECT * FROM game_players WHERE game_id = $1 ORDER BY seat', [id])
    return mapGame(gameResult.rows[0], playersResult.rows.map(mapPlayer))
  }

  async listGames({ limit = 20, cursor } = {}) {
    const values = cursor ? [cursor, limit] : [limit]
    const where = cursor ? 'WHERE completed_at < $1' : ''
    const limitParameter = cursor ? '$2' : '$1'
    const result = await this.pool.query(
      `SELECT * FROM games ${where} ORDER BY completed_at DESC, id LIMIT ${limitParameter}`,
      values,
    )
    const games = await Promise.all(result.rows.map(row => this.getGame(row.id)))
    return { games, nextCursor: games.length === limit ? games.at(-1).completedAt : null }
  }

  async getLeaderboard({ mode, limit = 50 }) {
    const result = await this.pool.query(
      `SELECT p.*, g.completed_at
       FROM game_players p
       JOIN games g ON g.id = p.game_id
       WHERE g.mode = $1
       ORDER BY g.completed_at ASC, p.seat ASC`,
      [mode],
    )
    const players = new Map()
    for (const row of result.rows) {
      const current = players.get(row.player_key) ?? {
        playerKey: row.player_key,
        playerName: row.player_name,
        bestScore: Number.NEGATIVE_INFINITY,
        gamesPlayed: 0,
        wins: 0,
        totalScore: 0,
        lastPlayedAt: new Date(row.completed_at).toISOString(),
      }
      current.playerName = row.player_name
      current.bestScore = Math.max(current.bestScore, row.total)
      current.gamesPlayed += 1
      current.wins += row.rank === 1 ? 1 : 0
      current.totalScore += row.total
      current.lastPlayedAt = new Date(row.completed_at).toISOString()
      players.set(row.player_key, current)
    }
    return [...players.values()]
      .sort((a, b) => b.bestScore - a.bestScore || b.wins - a.wins || a.playerName.localeCompare(b.playerName, 'de'))
      .slice(0, limit)
  }

  async health() {
    await this.pool.query('SELECT 1')
    return true
  }
}
