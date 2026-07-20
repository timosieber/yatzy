export class MemoryGameRepository {
  constructor() {
    this.games = new Map()
  }

  async saveGame(game) {
    const existing = this.games.get(game.id)
    if (existing) return { created: false, game: structuredClone(existing) }
    this.games.set(game.id, structuredClone(game))
    return { created: true, game: structuredClone(game) }
  }

  async countGames() { return this.games.size }

  async listGames({ limit = 20, cursor } = {}) {
    const games = [...this.games.values()]
      .filter(game => !cursor || game.completedAt < cursor)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, limit)
      .map(game => structuredClone(game))
    return { games, nextCursor: games.length === limit ? games.at(-1).completedAt : null }
  }

  async getGame(id) {
    const game = this.games.get(id)
    return game ? structuredClone(game) : null
  }

  async getLeaderboard({ mode, limit = 50 }) {
    const players = new Map()
    const games = [...this.games.values()]
      .filter(game => game.mode === mode && game.locker !== true)
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    for (const game of games) {
      for (const player of game.players) {
        const current = players.get(player.playerKey) ?? {
          playerKey: player.playerKey,
          playerName: player.name,
          bestScore: Number.NEGATIVE_INFINITY,
          gamesPlayed: 0,
          wins: 0,
          totalScore: 0,
          lastPlayedAt: game.completedAt,
        }
        current.playerName = player.name
        current.bestScore = Math.max(current.bestScore, player.total)
        current.gamesPlayed += 1
        current.wins += player.rank === 1 ? 1 : 0
        current.totalScore += player.total
        current.lastPlayedAt = game.completedAt
        players.set(player.playerKey, current)
      }
    }
    return [...players.values()]
      .sort((a, b) => b.bestScore - a.bestScore || b.wins - a.wins || a.playerName.localeCompare(b.playerName, 'de'))
      .slice(0, limit)
  }

  async health() { return true }
}
