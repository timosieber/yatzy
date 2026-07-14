import { useEffect, useState } from 'react'
import { fetchGame } from '../api/client.js'
import { getMode } from '../domain/modes.js'
import Dialog from './Dialog.jsx'

const dateFormatter = new Intl.DateTimeFormat('de-CH', { dateStyle: 'long', timeStyle: 'short' })

export default function GameDetail({ id, onClose }) {
  const [game, setGame] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let active = true
    fetchGame(id).then(value => { if (active) setGame(value) }).catch(value => { if (active) setError(value) })
    return () => { active = false }
  }, [id])

  return <Dialog title="Spielergebnis" description={game ? `${getMode(game.mode, game.config).label} · ${dateFormatter.format(new Date(game.completedAt))}` : undefined} onClose={onClose} className="game-detail-dialog">
    {!game && !error && <div className="state-panel" role="status">Spielblock wird geladen …</div>}
    {error && <div className="state-panel error-state">{error.message}</div>}
    {game && <ReadonlyScorecard game={game} />}
  </Dialog>
}

function ReadonlyScorecard({ game }) {
  const config = getMode(game.mode, game.config)
  const rows = [...config.upper, ...config.lower]
  return <div className="detail-table-wrap"><table aria-label={`Spielblock vom ${dateFormatter.format(new Date(game.completedAt))}`}>
    <thead><tr><th>Kategorie</th>{game.players.map(player => <th key={player.seat}>{player.name}</th>)}</tr></thead>
    <tbody>
      {rows.map(category => <tr key={category.key}><th>{category.label}</th>{game.players.map(player => <td key={player.seat}>{player.scores[category.key]}</td>)}</tr>)}
      <tr className="summary-row"><th>Oben</th>{game.players.map(player => <td key={player.seat}>{player.upperTotal}</td>)}</tr>
      <tr className="bonus-row"><th>Bonus</th>{game.players.map(player => <td key={player.seat}>{player.bonus}</td>)}</tr>
      <tr className="total-row"><th>Gesamt</th>{game.players.map(player => <td key={player.seat}>{player.total}</td>)}</tr>
    </tbody>
  </table></div>
}
