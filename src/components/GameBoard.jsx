import { ChevronLeft, Moon, Sun, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { gameReducer } from '../domain/game.js'
import { calculatePlayer } from '../domain/scoring.js'
import Brand from './Brand.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import ScoreDialog from './ScoreDialog.jsx'
import WinnerDialog from './WinnerDialog.jsx'

export default function GameBoard({ game, theme, onTheme, onChange, onExit, onNewRound }) {
  const [selection, setSelection] = useState(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [winnerOpen, setWinnerOpen] = useState(game.status === 'finished')
  const active = game.players[game.activePlayer]
  const activeResult = calculatePlayer(active.scores, game.config)

  const choose = (category, playerIndex) => {
    const value = game.players[playerIndex].scores[category.key]
    if (value === undefined && playerIndex !== game.activePlayer) return
    setSelection({ category, playerIndex, correction: value !== undefined, initialValue: value })
  }

  const save = value => {
    const next = gameReducer(game, {
      type: selection.correction ? 'correct' : 'score',
      playerIndex: selection.playerIndex,
      category: selection.category.key,
      value,
    })
    setSelection(null)
    onChange(next)
    if (next.status === 'finished') setWinnerOpen(true)
  }

  const row = category => <tr key={category.key}>
    <th scope="row">{category.label}</th>
    {game.players.map((player, playerIndex) => {
      const value = player.scores[category.key]
      const enabled = value !== undefined || playerIndex === game.activePlayer
      const action = value === undefined ? 'eintragen' : 'korrigieren'
      return <td key={player.id} className={playerIndex === game.activePlayer ? 'active-column' : ''}>
        {enabled ? <button type="button" className={`score-cell ${value === undefined ? 'empty' : value === 0 ? 'crossed' : ''}`} onClick={() => choose(category, playerIndex)} aria-label={`${player.name} – ${category.label} ${action}`}>{value === undefined ? '+' : value}</button> : <span className="score-cell disabled" aria-hidden="true">–</span>}
      </td>
    })}
  </tr>

  const summaryRow = (label, field, className = '') => <tr className={className}>
    <th scope="row">{label}</th>
    {game.players.map((player, index) => <td key={player.id} className={index === game.activePlayer ? 'active-column' : ''}>{calculatePlayer(player.scores, game.config)[field]}</td>)}
  </tr>

  return <main className="game-page">
    <header className="game-topbar">
      <button type="button" className="back-button" onClick={() => setConfirmExit(true)} aria-label="Spiel verlassen"><ChevronLeft size={20} /><Brand compact /></button>
      <div className="topbar-actions">
        <button type="button" className="icon-button" disabled={!game.history.length} onClick={() => onChange(gameReducer(game, { type: 'undo' }))} aria-label="Letzte Eingabe rückgängig"><Undo2 size={19} /></button>
        <button type="button" className="icon-button" onClick={onTheme} aria-label="Darstellung wechseln">{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
      </div>
    </header>

    <section className="turn-banner" aria-live="polite">
      <div><p>{game.config.label} · {game.config.dice} Würfel</p><h1><span className="status-dot" />{active.name} ist dran</h1><span>Wähle eine freie Kategorie.</span></div>
      <div className="current-total"><small>Gesamt</small><strong>{activeResult.total}</strong></div>
    </section>

    <section className="score-progress" aria-label="Aktueller Punktestand">
      <div><small>Oben</small><strong>{activeResult.upper}</strong></div>
      <div><small>Bis Bonus</small><strong>{Math.max(0, game.config.upperTarget - activeResult.upper)}</strong></div>
      <div><small>Bonus</small><strong>{activeResult.bonus || '–'}</strong></div>
    </section>

    <div className="score-table-wrap">
      <table aria-label="Yatzy-Spielblock" style={{ '--player-count': game.players.length }}>
        <colgroup><col className="category-column" />{game.players.map(player => <col className="player-column" key={player.id} />)}</colgroup>
        <thead><tr><th scope="col">Kategorie</th>{game.players.map((player, index) => <th scope="col" key={player.id} className={index === game.activePlayer ? 'active-column' : ''}><span>{player.name}</span><small>{calculatePlayer(player.scores, game.config).total}</small></th>)}</tr></thead>
        <tbody>
          <tr className="section-row"><th colSpan={game.players.length + 1}>Oben</th></tr>
          {game.config.upper.map(row)}
          {summaryRow('Oben gesamt', 'upper', 'summary-row')}
          {summaryRow(`Bonus ab ${game.config.upperTarget}`, 'bonus', 'bonus-row')}
          <tr className="section-row"><th colSpan={game.players.length + 1}>Unten</th></tr>
          {game.config.lower.map(row)}
          {summaryRow('Unten gesamt', 'lower', 'summary-row')}
          {summaryRow('Gesamt', 'total', 'total-row')}
        </tbody>
      </table>
    </div>
    <p className="game-note">Echt würfeln, fertige Punktzahl hier eintragen.</p>

    {selection && <ScoreDialog {...selection} config={game.config} onSave={save} onClose={() => setSelection(null)} />}
    {confirmExit && <ConfirmDialog title="Spiel verlassen?" description="Dein Spiel bleibt gespeichert und kann später fortgesetzt werden." confirmLabel="Spiel verlassen" onClose={() => setConfirmExit(false)} onConfirm={onExit} />}
    {winnerOpen && <WinnerDialog game={game} onClose={() => setWinnerOpen(false)} onNewRound={onNewRound} />}
  </main>
}
