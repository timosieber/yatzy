import { CalendarDays, ChevronRight, RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchGames } from '../api/client.js'
import { getMode } from '../domain/modes.js'
import GameDetail from './GameDetail.jsx'

const dateFormatter = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeStyle: 'short' })

export default function History() {
  const [state, setState] = useState({ status: 'loading', games: [], error: null })
  const [selected, setSelected] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setState(current => ({ ...current, status: 'loading', error: null }))
    fetchGames({ limit: 30 })
      .then(result => { if (active) setState({ status: 'ready', games: result.games, error: null }) })
      .catch(error => { if (active) setState({ status: 'error', games: [], error }) })
    return () => { active = false }
  }, [reload])

  return <main className="records-page">
    <header className="records-header"><div><h1>Vergangene Spiele</h1><p>Alle abgeschlossenen Runden an einem Ort.</p></div></header>
    {state.status === 'loading' && <div className="state-panel" role="status"><span className="spinner" /> Spiele werden geladen …</div>}
    {state.status === 'error' && <div className="state-panel error-state"><h2>Spiele konnten nicht geladen werden</h2><p>{state.error.message}</p><button type="button" className="secondary-button" onClick={() => setReload(value => value + 1)}><RotateCw size={17} /> Erneut versuchen</button></div>}
    {state.status === 'ready' && state.games.length === 0 && <div className="state-panel"><CalendarDays size={30} /><h2>Noch keine Spiele</h2><p>Nach der ersten fertigen Runde erscheint sie hier.</p></div>}
    {state.games.length > 0 && <div className="history-list">{state.games.map(game => {
      const winners = game.players.filter(player => player.rank === 1)
      return <article className="history-row" key={game.id}>
        <div className="history-date"><CalendarDays size={17} /><time dateTime={game.completedAt}>{dateFormatter.format(new Date(game.completedAt))}</time></div>
        <div><span className="mode-name">{getMode(game.mode, game.config).label}</span><h2>{winners.length > 1 ? `${winners.map(player => player.name).join(' & ')} teilen den Sieg` : `${winners[0].name} gewinnt`}</h2><p>{game.players.map(player => player.name).join(', ')}</p></div>
        <div className="history-result"><strong>{Math.max(...game.players.map(player => player.total))}</strong><small>Bestes Ergebnis</small></div>
        <button type="button" className="detail-button" onClick={() => setSelected(game.id)}>Details <ChevronRight size={17} /></button>
      </article>
    })}</div>}
    {selected && <GameDetail id={selected} onClose={() => setSelected(null)} />}
  </main>
}
