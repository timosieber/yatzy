import { useState } from 'react'
import { isValidScore, validScores } from '../domain/scoring.js'
import Dialog from './Dialog.jsx'

export default function ScoreDialog({ category, config, initialValue, correction, onSave, onClose }) {
  const [value, setValue] = useState(initialValue ?? (category.input === 'repeat' ? 0 : null))
  const [manualValue, setManualValue] = useState(initialValue === undefined ? '' : String(initialValue))
  const scores = category.input === 'manual' || category.input === 'repeat'
    ? []
    : validScores(category, config).filter(score => score !== 0)
  const parsedManual = manualValue === '' ? null : Number(manualValue)
  const selectedValue = category.input === 'manual' ? parsedManual : value
  const canSave = selectedValue !== null && isValidScore(category, selectedValue, config)
  const manualInvalid = manualValue !== '' && !isValidScore(category, parsedManual, config)

  return <Dialog
    title={correction ? `${category.label} korrigieren` : category.label}
    description={correction ? 'Die Korrektur ändert den aktuellen Spieler nicht.' : category.input === 'manual' ? 'Trage deine fertige Punktzahl ein.' : category.input === 'repeat' ? 'Jeder Yatzy erhöht den Wert um 50 Punkte.' : 'Wähle die fertige Punktzahl deiner Würfel.'}
    onClose={onClose}
    className="score-dialog"
  >
    {category.input === 'manual' && <div className="manual-score-field">
      <label htmlFor="manual-score">Punkte für {category.label}</label>
      <input
        id="manual-score"
        type="number"
        min="0"
        max={Number.MAX_SAFE_INTEGER}
        step="1"
        inputMode="numeric"
        value={manualValue}
        aria-describedby={manualInvalid ? 'manual-score-error' : undefined}
        onChange={event => setManualValue(event.target.value)}
      />
      {manualInvalid && <p className="field-error" id="manual-score-error">Bitte eine ganze Zahl ab 0 eingeben.</p>}
    </div>}
    {category.input === 'repeat' && <div className="repeat-score" role="group" aria-label="Yatzy-Punkte anpassen">
      <button type="button" className="secondary-button" disabled={value === 0} onClick={() => setValue(current => Math.max(0, current - category.step))} aria-label="50 Punkte entfernen">−50</button>
      <output className="repeat-score-value" aria-live="polite">{value}</output>
      <button type="button" className="secondary-button" disabled={!isValidScore(category, value + category.step, config)} onClick={() => setValue(current => current + category.step)} aria-label="50 Punkte hinzufügen">+50</button>
    </div>}
    {category.input !== 'manual' && category.input !== 'repeat' && <div className="score-options" role="group" aria-label={`Mögliche Punkte für ${category.label}`}>
      {scores.map(score => <button type="button" key={score} className={value === score ? 'selected' : ''} aria-pressed={value === score} onClick={() => setValue(score)}>{score} Punkte</button>)}
    </div>}
    <div className="dialog-actions">
      <button type="button" className="primary-button" disabled={!canSave} onClick={() => onSave(selectedValue)}>{correction ? 'Korrektur speichern' : 'Eintragen'}</button>
      <button type="button" className="danger-ghost" onClick={() => onSave(0)}>Streichen</button>
    </div>
  </Dialog>
}
