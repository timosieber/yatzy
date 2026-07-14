import { useState } from 'react'
import { validScores } from '../domain/scoring.js'
import Dialog from './Dialog.jsx'

export default function ScoreDialog({ category, config, initialValue, correction, onSave, onClose }) {
  const [value, setValue] = useState(initialValue ?? null)
  const scores = validScores(category, config).filter(score => score !== 0)
  return <Dialog
    title={correction ? `${category.label} korrigieren` : category.label}
    description={correction ? 'Die Korrektur ändert den aktuellen Spieler nicht.' : 'Wähle die fertige Punktzahl deiner Würfel.'}
    onClose={onClose}
    className="score-dialog"
  >
    <div className="score-options" role="group" aria-label={`Mögliche Punkte für ${category.label}`}>
      {scores.map(score => <button type="button" key={score} className={value === score ? 'selected' : ''} aria-pressed={value === score} onClick={() => setValue(score)}>{score} Punkte</button>)}
    </div>
    <div className="dialog-actions">
      <button type="button" className="primary-button" disabled={value === null} onClick={() => onSave(value)}>{correction ? 'Korrektur speichern' : 'Eintragen'}</button>
      <button type="button" className="danger-ghost" onClick={() => onSave(0)}>Streichen</button>
    </div>
  </Dialog>
}
