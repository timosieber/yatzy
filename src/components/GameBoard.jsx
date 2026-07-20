import { ChevronLeft, ChevronRight, Moon, Sun, Undo2 } from 'lucide-react'
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
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [winnerOpen, setWinnerOpen] = useState(game.status === 'finished')
  const locker = game.locker
  const active = game.players[game.activePlayer]
  const activeResult = calculatePlayer(active.scores, game.config)

  const choose = (category, playerIndex) => {
    const value = game.players[playerIndex].scores[category.key]
    if (!locker && value === undefined && playerIndex !== game.activePlayer) return
    setSelection({ category, playerIndex, correction: value !== undefined, initialValue: value })
  }

  const save = value => {
    const next = locker
      ? gameReducer(game, { type: 'set', playerIndex: selection.playerIndex, category: selection.category.key, value })
      : gameReducer(game, {
        type: selection.correction ? 'correct' : 'score',
        playerIndex: selection.playerIndex,
        category: selection.category.key,
        value,
      })
    setSelection(null)
    onChange(next)
    if (!locker && next.status === 'finished') setWinnerOpen(true)
  }

  const clearCell = () => {
    const next = gameReducer(game, { type: 'clear', playerIndex: selection.playerIndex, category: selection.category.key })
    onChange(next)
    setSelection(null)
  }

  const goto = index => onChange(gameReducer(game, { type: 'setActive', playerIndex: index }))

  const row = category => <tr key={category.key}>
    <th scope="row">{category.label}</th>
    {game.players.map((player, playerIndex) => {
      const value = player.scores[category.key]
      const enabled = locker || value !== undefined || playerIndex === game.activePlayer
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
      <div>
        <p>{game.config.label} · {game.config.dice} Würfel</p>
        <h1><span className="status-dot" />{active.name} ist {locker ? 'an der Reihe' : 'dran'}</h1>
        <span>{locker ? 'Trage frei ein und wechsle jederzeit die Person.' : 'Wähle eine freie Kategorie.'}</span>
        {locker && <div className="turn-nav">
          <button type="button" className="icon-button" onClick={() => goto((game.activePlayer - 1 + game.players.length) % game.players.length)} aria-label="Vorherige Person"><ChevronLeft size={18} /></button>
          <button type="button" className="icon-button" onClick={() => goto((game.activePlayer + 1) % game.players.length)} aria-label="Nächste Person"><ChevronRight size={18} /></button>
        </div>}
      </div>
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
        <thead><tr><th scope="col">Kategorie</th>{game.players.map((player, index) => <th scope="col" key={player.id} className={index === game.activePlayer ? 'active-column' : ''}>{locker ? <button type="button" className="column-name-button" onClick={() => goto(index)} aria-label={`${player.name} ist an der Reihe`}>{player.name}</button> : <span>{player.name}</span>}<small>{calculatePlayer(player.scores, game.config).total}</small></th>)}</tr></thead>
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
    <p className="game-note">{locker ? 'Frei eintragen, korrigieren oder leeren – beende das Spiel, wenn alle fertig sind.' : 'Echt würfeln, fertige Punktzahl hier eintragen.'}</p>
    {locker && <button type="button" className="finish-game-button" onClick={() => setConfirmFinish(true)}>Spiel beenden</button>}

    {selection && <ScoreDialog {...selection} config={game.config} onSave={save} onClose={() => setSelection(null)} {...(locker ? { onClear: clearCell } : {})} />}
    {confirmExit && <ConfirmDialog title="Spiel verlassen?" description="Dein Spiel bleibt gespeichert und kann später fortgesetzt werden." confirmLabel="Spiel verlassen" onClose={() => setConfirmExit(false)} onConfirm={onExit} />}
    {confirmFinish && <ConfirmDialog title="Spiel beenden?" description="Leere Felder zählen als 0 Punkte. Das Spiel wird gespeichert und erscheint im Verlauf, aber nicht in der Bestenliste." confirmLabel="Jetzt beenden" onClose={() => setConfirmFinish(false)} onConfirm={() => {
      const next = gameReducer(game, { type: 'finish' })
      onChange(next)
      setConfirmFinish(false)
      setWinnerOpen(true)
    }} />}
    {winnerOpen && <WinnerDialog game={game} onClose={() => setWinnerOpen(false)} onNewRound={onNewRound} />}
  </main>
}
