import { Check, Moon, Plus, Sun, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getMode, MODE_KEYS } from '../domain/modes.js'
import Brand from './Brand.jsx'

const fallbackNames = ['Mara', 'Timo', 'Noah', 'Lina', 'Evan', 'Aiden', 'Mika', 'Nina']

function normalized(value) {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('de-CH')
}

export default function Setup({ initialSetup, activeGame, theme, onTheme, onStart, onResume, onDiscard }) {
  const [mode, setMode] = useState(initialSetup?.mode ?? 'standard')
  const [names, setNames] = useState(initialSetup?.names?.length >= 2 ? initialSetup.names : ['Mara', 'Timo'])
  const [dice, setDice] = useState(initialSetup?.dice ?? 7)
  const [upperTargetCount, setUpperTargetCount] = useState(initialSetup?.upperTargetCount ?? 3)
  const [bonusValue, setBonusValue] = useState(initialSetup?.bonusValue ?? 35)
  const modes = useMemo(() => MODE_KEYS.map(key => getMode(key)), [])
  const cleanNames = names.map(name => name.trim())
  const duplicateNames = new Set(cleanNames.map(normalized)).size !== cleanNames.length
  const emptyNames = cleanNames.some(name => !name)
  const valid = !duplicateNames && !emptyNames

  const submit = event => {
    event.preventDefault()
    if (!valid) return
    onStart({ mode, names: cleanNames, dice, upperTargetCount, bonusValue })
  }

  return <main className="setup-page">
    <header className="topbar">
      <Brand />
      <button className="icon-button" type="button" onClick={onTheme} aria-label="Darstellung wechseln">
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </header>

    <div className="setup-layout">
      <section className="setup-intro">
        <h1>Neues Spiel</h1>
        <p>Modus wählen, Namen eintragen und direkt losspielen.</p>
      </section>

      {activeGame && <section className="resume-panel" aria-labelledby="resume-title">
        <div><span className="status-dot" /><div><h2 id="resume-title">Laufendes Spiel</h2><p>{activeGame.config.label} · {activeGame.players.length} Spieler</p></div></div>
        <div className="resume-actions"><button className="secondary-button" type="button" onClick={onDiscard}>Verwerfen</button><button className="primary-button compact" type="button" onClick={onResume}>Fortsetzen</button></div>
      </section>}

      <form className="setup-form" onSubmit={submit}>
        <fieldset className="form-section">
          <legend>Spielmodus</legend>
          <div className="mode-list">
            {modes.map(item => <button
              type="button"
              key={item.key}
              className={`mode-option ${mode === item.key ? 'selected' : ''}`}
              aria-pressed={mode === item.key}
              onClick={() => setMode(item.key)}
            >
              <span className="mode-radio" aria-hidden="true">{mode === item.key && <Check size={14} />}</span>
              <span><strong>{item.label}</strong><small>{item.subtitle}</small></span>
            </button>)}
          </div>
        </fieldset>

        {mode === 'free' && <fieldset className="form-section rule-panel">
          <legend>Freie Regeln</legend>
          <div className="rule-control"><div><label htmlFor="free-dice">Würfelanzahl</label><output htmlFor="free-dice">{dice}</output></div><input id="free-dice" aria-label="Würfelanzahl" type="range" min="5" max="8" value={dice} onChange={event => {
            const next = Number(event.target.value)
            setDice(next)
            setUpperTargetCount(current => Math.min(current, next))
          }} /></div>
          <label>Bonusziel <select aria-label="Bonusziel" value={upperTargetCount} onChange={event => setUpperTargetCount(Number(event.target.value))}>
            {Array.from({ length: dice - 1 }, (_, index) => index + 2).map(value => <option key={value} value={value}>{value} je Augenzahl ({value * 21})</option>)}
          </select></label>
          <label>Bonuswert <select aria-label="Bonuswert" value={bonusValue} onChange={event => setBonusValue(Number(event.target.value))}>
            {Array.from({ length: 21 }, (_, index) => index * 5).map(value => <option key={value} value={value}>{value} Punkte</option>)}
          </select></label>
        </fieldset>}

        <fieldset className="form-section">
          <div className="legend-row"><legend>Spieler</legend><span>{names.length}/8</span></div>
          <div className="player-list">
            {names.map((name, index) => <div className="player-field" key={index}>
              <span className="player-index">{index + 1}</span>
              <label className="sr-only" htmlFor={`player-${index}`}>Name von Spieler {index + 1}</label>
              <input id={`player-${index}`} aria-label={`Name von Spieler ${index + 1}`} maxLength="40" value={name} onChange={event => setNames(current => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
              {names.length > 2 && <button className="icon-button small" type="button" aria-label={`Spieler ${index + 1} entfernen`} onClick={() => setNames(current => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /></button>}
            </div>)}
          </div>
          {duplicateNames && <p className="form-error" role="alert">Namen müssen eindeutig sein.</p>}
          {emptyNames && <p className="form-error" role="alert">Jeder Spieler braucht einen Namen.</p>}
          <button className="text-button" type="button" disabled={names.length >= 8} onClick={() => setNames(current => [...current, fallbackNames[current.length] ?? `Spieler ${current.length + 1}`])}><Plus size={18} /> Spieler hinzufügen</button>
        </fieldset>

        <button className="primary-button" disabled={!valid} type="submit">Spiel starten</button>
      </form>
    </div>
  </main>
}
