import { RotateCw, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchLeaderboard } from '../api/client.js'
import { getMode, MODE_KEYS } from '../domain/modes.js'

const dateFormatter = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' })

export default function Leaderboard() {
  const [mode, setMode] = useState('standard')
  const [state, setState] = useState({ status: 'loading', players: [], error: null })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setState(current => ({ ...current, status: 'loading', error: null }))
    fetchLeaderboard(mode)
      .then(players => { if (active) setState({ status: 'ready', players, error: null }) })
      .catch(error => { if (active) setState({ status: 'error', players: [], error }) })
    return () => { active = false }
  }, [mode, reload])

  return <main className="records-page">
    <header className="records-header"><div><h1>Bestenliste</h1><p>Die besten Ergebnisse aller gespeicherten Runden.</p></div><label>Spielmodus<select aria-label="Spielmodus" value={mode} onChange={event => setMode(event.target.value)}>{MODE_KEYS.map(key => <option value={key} key={key}>{getMode(key).label}</option>)}</select></label></header>
    {state.status === 'loading' && <div className="state-panel" role="status"><span className="spinner" /> Bestenliste wird geladen …</div>}
    {state.status === 'error' && <div className="state-panel error-state"><h2>Bestenliste konnte nicht geladen werden</h2><p>{state.error.message}</p><button type="button" className="secondary-button" onClick={() => setReload(value => value + 1)}><RotateCw size={17} /> Erneut versuchen</button></div>}
    {state.status === 'ready' && state.players.length === 0 && <div className="state-panel"><Trophy size={32} /><h2>Noch keine Ergebnisse</h2><p>Spiele zuerst eine Runde in diesem Modus.</p></div>}
    {state.players.length > 0 && <div className="leaderboard-wrap"><table aria-label={`Bestenliste ${getMode(mode).label}`}>
      <thead><tr><th>#</th><th>Spieler</th><th>Spiele</th><th>Siege</th><th>Bestes Ergebnis</th><th>Gesamt</th><th>Zuletzt</th></tr></thead>
      <tbody>{state.players.map((player, index) => <tr key={player.playerKey ?? player.playerName}><td><span className={`rank-badge rank-${index + 1}`}>{index + 1}</span></td><th>{player.playerName}</th><td>{player.gamesPlayed}</td><td>{player.wins}</td><td className="highlight-score">{player.bestScore}</td><td>{player.totalScore}</td><td>{dateFormatter.format(new Date(player.lastPlayedAt))}</td></tr>)}</tbody>
    </table></div>}
  </main>
}
