import { Medal, Trophy } from 'lucide-react'
import { rankPlayers } from '../domain/scoring.js'
import Dialog from './Dialog.jsx'

export default function WinnerDialog({ game, onNewRound, onClose }) {
  const ranking = rankPlayers(game.players, game.config)
  const winners = ranking.filter(player => player.rank === 1)
  return <Dialog title={winners.length > 1 ? 'Unentschieden!' : `${winners[0].name} gewinnt!`} description="Die Runde wurde gespeichert und wird mit Railway synchronisiert." onClose={onClose} className="winner-dialog">
    <div className="trophy-mark"><Trophy size={34} /></div>
    <div className="ranking-list">{ranking.map(player => <div key={player.id} className={player.rank === 1 ? 'winner' : ''}><span>{player.rank === 1 ? <Medal size={18} /> : player.rank}</span><strong>{player.name}</strong><b>{player.total}</b></div>)}</div>
    <button type="button" className="primary-button" onClick={onNewRound}>Neue Runde</button>
  </Dialog>
}
