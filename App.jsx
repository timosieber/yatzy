import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, Dices, Medal, Moon, Plus, RotateCcw, Settings2, Sun, Trophy, Undo2, X } from 'lucide-react'

const UPPER = [
  ['ones', 'Einser', 1], ['twos', 'Zweier', 2], ['threes', 'Dreier', 3],
  ['fours', 'Vierer', 4], ['fives', 'Fünfer', 5], ['sixes', 'Sechser', 6],
]

const LOWER = [
  ['pair', '1 Paar', 'pair'], ['twoPairs', '2 Paare', 'twoPairs'], ['threeKind', '3 gleiche', 'kind3'],
  ['fourKind', '4 gleiche', 'kind4'], ['fullHouse', 'Full House', 'total'], ['smallStraight', 'Kleine Strasse', 'fixed', 15],
  ['largeStraight', 'Grosse Strasse', 'fixed', 20], ['yatzy', 'Yatzy', 'fixed', 50], ['chance', 'Chance', 'total'],
]

const MODES = {
  standard: { label: 'Standard', subtitle: '5 Würfel, klassischer Spielblock', dice: 5, upper: UPPER, lower: LOWER, yatzy: 50 },
  blitz: { label: 'Blitz', subtitle: 'Nur oben, Yatzy und Chance', dice: 5, upper: UPPER, lower: [LOWER[7], LOWER[8]], yatzy: 50 },
  maxi: { label: 'Maxi Yatzy', subtitle: '6 Würfel, extra Kategorien', dice: 6, upper: UPPER, lower: [...LOWER.slice(0, 2), ['threePairs', '3 Paare', 'threePairs'], ...LOWER.slice(2, 4), ['fiveKind', '5 gleiche', 'kind5'], ['tower', 'Turm (3 + 3)', 'total'], ...LOWER.slice(4, 5), ['fullStraight', 'Volle Strasse', 'fixed', 21], ...LOWER.slice(5, 7), ['yatzy', 'Yatzy', 'fixed', 100], LOWER[8]], yatzy: 100 },
  free: { label: 'Freie Würfel', subtitle: 'Eigene Regeln einstellen', dice: 7, upper: UPPER, lower: LOWER, yatzy: 50 },
}

const defaultNames = ['Mara', 'Timo', 'Noah', 'Lina', 'Evan', 'Aiden', 'Mika', 'Nina']

function calcTotal(scores, mode) {
  const upper = mode.upper.reduce((sum, [key]) => sum + (scores[key] ?? 0), 0)
  const lower = mode.lower.reduce((sum, [key]) => sum + (scores[key] ?? 0), 0)
  const bonus = mode.upper.every(([key]) => scores[key] !== undefined) && upper >= 0 ? 35 : 0
  return { upper, lower, bonus, total: upper + lower + bonus }
}

function animateCount(value, active) {
  return <span className={active ? 'score-pop' : ''}>{value > 0 ? `+${value}` : value}</span>
}

function Setup({ onStart, dark, setDark }) {
  const [modeKey, setModeKey] = useState('standard')
  const [names, setNames] = useState(['Mara', 'Timo'])
  const [freeDice, setFreeDice] = useState(7)
  const [par, setPar] = useState(3)
  const add = () => names.length < 8 && setNames([...names, defaultNames[names.length]])
  const remove = (index) => names.length > 2 && setNames(names.filter((_, i) => i !== index))
  const start = () => onStart({ modeKey, names: names.map((name, i) => name.trim() || `Spieler ${i + 1}`), dice: modeKey === 'free' ? freeDice : MODES[modeKey].dice, par })
  return <main className="setup-shell">
    <header className="brand-row"><div className="brand-mark"><Dices size={24}/></div><span>Würfelblock</span><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Darstellung wechseln">{dark ? <Sun size={19}/> : <Moon size={19}/>}</button></header>
    <section className="setup-copy"><h1>Der Spielblock,<br/><em>ohne Rechnen.</em></h1><p>Ihr würfelt echt, der Block macht den Rest.</p></section>
    <section className="setup-section"><h2>Spielmodus</h2><div className="mode-list">{Object.entries(MODES).map(([key, mode]) => <button key={key} className={`mode-option ${modeKey === key ? 'selected' : ''}`} onClick={() => setModeKey(key)}><span className="mode-radio">{modeKey === key && <Check size={14}/>}</span><span><strong>{mode.label}</strong><small>{mode.subtitle}</small></span>{key === 'standard' && <span className="recommended">Empfohlen</span>}</button>)}</div></section>
    {modeKey === 'free' && <section className="rule-panel"><label>Würfelanzahl <b>{freeDice}</b><input type="range" min="5" max="8" value={freeDice} onChange={e => setFreeDice(Number(e.target.value))}/><span>5</span><span>8</span></label><label>Par im oberen Teil <div className="stepper"><button onClick={() => setPar(Math.max(2, par - 1))}>−</button><b>{par} gleiche</b><button onClick={() => setPar(Math.min(freeDice, par + 1))}>+</button></div></label></section>}
    {modeKey === 'maxi' && <section className="rule-panel"><label>Par im oberen Teil <div className="segmented"><button className={par === 3 ? 'active' : ''} onClick={() => setPar(3)}>3 gleiche</button><button className={par === 4 ? 'active' : ''} onClick={() => setPar(4)}>4 gleiche</button></div></label></section>}
    <section className="setup-section players-section"><div className="section-title"><h2>Spielerinnen und Spieler</h2><span>{names.length}/8</span></div>{names.map((name, index) => <div className="name-row" key={index}><span className="player-number">{index + 1}</span><input value={name} onChange={e => setNames(names.map((n, i) => i === index ? e.target.value : n))}/>{names.length > 2 && <button className="remove" onClick={() => remove(index)}><X size={18}/></button>}</div>)}<button className="add-player" onClick={add} disabled={names.length === 8}><Plus size={18}/> Spieler hinzufügen</button></section>
    <button className="primary-button setup-start" onClick={start}>Spiel starten <span>→</span></button>
  </main>
}

function InputSheet({ category, mode, onSave, onClose }) {
  const [value, setValue] = useState(category.type === 'fixed' ? category.fixed : null)
  const [manual, setManual] = useState('')
  const kind = category.type
  const title = category.label
  const countOptions = Array.from({ length: mode.dice + 1 }, (_, index) => index)
  const total = Number(manual || 0)
  let resolved = value ?? 0
  if (kind === 'upper') resolved = ((value ?? 0) - mode.par) * category.face
  if (kind === 'pair') resolved = (value ?? 0) * 2
  if (kind === 'twoPairs') resolved = total
  if (kind === 'threePairs') resolved = total
  if (kind?.startsWith('kind')) resolved = (value ?? 0) * Number(kind.slice(4))
  if (kind === 'total') resolved = total
  const isManual = ['total', 'twoPairs', 'threePairs'].includes(kind)
  const canSave = kind === 'fixed' || (isManual ? manual !== '' : value !== null)
  const label = kind === 'upper' ? `${title}: dein Ergebnis` : kind === 'fixed' ? `${title} geschafft?` : isManual ? 'Punktzahl eintragen' : `Welche Augenzahl?`
  const append = number => setManual(current => current.length < 2 ? `${current}${number}` : current)
  return <div className="sheet-backdrop" onMouseDown={onClose}><section className="input-sheet" onMouseDown={e => e.stopPropagation()}><div className="sheet-handle"/><div className="sheet-top"><div className="sheet-category"><div className="mini-die"><Dices size={19}/></div><span>{title}</span></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div><h2>{label}</h2>
    {kind === 'upper' && <p className="sheet-hint">{mode.par} gleiche sind par. Tippe direkt auf deinen Plus/Minus-Wert.</p>}
    {kind === 'fixed' ? <button className="fixed-choice selected"><Check size={19}/>{category.fixed} Punkte</button> : kind === 'upper' ? <div className="upper-pad">{countOptions.map(number => { const score = (number - mode.par) * category.face; return <button key={number} className={value === number ? 'selected' : ''} onClick={() => setValue(number)}><small>{number}× {title}</small><strong>{score > 0 ? '+' : ''}{score}</strong></button> })}</div> : isManual ? <><div className="manual-display">{manual || '–'}<small>Punkte</small></div><div className="pin-pad">{[1,2,3,4,5,6,7,8,9].map(number => <button key={number} onClick={() => append(number)}>{number}</button>)}<button className="clear-key" onClick={() => setManual('')}>C</button><button onClick={() => append(0)}>0</button><button className="back-key" onClick={() => setManual(v => v.slice(0, -1))}>⌫</button></div></> : <div className="number-grid">{[1,2,3,4,5,6].map(number => <button key={number} className={value === number ? 'selected' : ''} onClick={() => setValue(number)}>{number}</button>)}</div>}
    <div className={`calculated ${resolved === 0 ? 'neutral' : ''}`}>{resolved > 0 ? '+' : ''}{resolved} <span>Punkte</span></div>
    <button className="primary-button" disabled={!canSave} onClick={() => onSave(resolved)}>Eintragen</button><button className="ghost-button" onClick={() => onSave(0)}>Streichen</button>
  </section></div>
}

function ScoreCell({ value, active, onClick, disabled }) {
  if (value === undefined) return <button className={`score-cell open ${active ? 'active-cell' : ''}`} disabled={disabled} onClick={onClick}>+</button>
  return <span className={`score-cell entered ${value === 0 ? 'crossed' : ''}`}>{value === 0 ? '0' : animateCount(value, active)}</span>
}

function Game({ config, onExit, dark, setDark }) {
  const mode = useMemo(() => ({ ...MODES[config.modeKey], dice: config.dice, par: config.par }), [config])
  const [players, setPlayers] = useState(config.names.map(name => ({ name, scores: {} })))
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [celebrate, setCelebrate] = useState(false)
  const [showWinner, setShowWinner] = useState(false)
  const activePlayer = players[active]
  const isDone = players.every(player => [...mode.upper, ...mode.lower].every(([key]) => player.scores[key] !== undefined))
  const categoryRows = [
    ...mode.upper.map(([key, label, face]) => ({ key, label, type: 'upper', face })),
    { key: '__upper', label: 'Oberer Teil', total: 'upper' }, { key: '__bonus', label: 'Bonus', total: 'bonus' },
    ...mode.lower.map(([key, label, type, fixed]) => ({ key, label, type, fixed })),
    { key: '__lower', label: 'Unterer Teil', total: 'lower' }, { key: '__total', label: 'Gesamt', total: 'total' },
  ]
  useEffect(() => { if (isDone) setTimeout(() => setShowWinner(true), 450) }, [isDone])
  const choose = category => { if (!category.total && activePlayer.scores[category.key] === undefined) setSelected(category) }
  const save = value => {
    const key = selected.key
    const previous = players.map(player => ({ ...player, scores: { ...player.scores } }))
    const wasBonus = calcTotal(activePlayer.scores, mode).bonus
    const next = players.map((player, i) => i === active ? { ...player, scores: { ...player.scores, [key]: value } } : player)
    const newBonus = calcTotal(next[active].scores, mode).bonus
    setHistory([...history, { players: previous, active }]); setPlayers(next); setSelected(null)
    if (!wasBonus && newBonus) { setCelebrate(true); setTimeout(() => setCelebrate(false), 1800) }
    let nextActive = active
    for (let jump = 1; jump <= players.length; jump++) { const candidate = (active + jump) % players.length; if (next[candidate].scores[key] === undefined) { nextActive = candidate; break } }
    setActive(nextActive)
  }
  const undo = () => { const last = history.at(-1); if (!last) return; setPlayers(last.players); setActive(last.active); setHistory(history.slice(0, -1)); setShowWinner(false) }
  const ranking = [...players].map(player => ({ ...player, ...calcTotal(player.scores, mode) })).sort((a,b) => b.total - a.total)
  return <main className="game-shell">
    <header className="game-header"><button className="brand-compact" onClick={onExit}><ChevronLeft size={20}/><div className="brand-mark"><Dices size={20}/></div><span>Würfelblock</span></button><div className="header-actions"><button className="icon-button undo" disabled={!history.length} onClick={undo}><Undo2 size={19}/></button><button className="icon-button" onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button></div></header>
    <div className="turn-card"><div><span className="turn-eyebrow">{mode.label} · {mode.dice} Würfel</span><h1><span className="turn-dot"/>{activePlayer.name} ist dran</h1><p>Wähle eine Kategorie und trage die Würfel ein.</p></div><div className="turn-total"><small>Gesamt</small><strong>{calcTotal(activePlayer.scores, mode).total}</strong></div></div>
    <section className="live-stats"><div><small>Oben</small><b className={calcTotal(activePlayer.scores, mode).upper >= 0 ? 'positive' : 'negative'}>{calcTotal(activePlayer.scores, mode).upper > 0 ? '+' : ''}{calcTotal(activePlayer.scores, mode).upper}</b></div><div><small>Bis Bonus</small><b>{Math.max(0, -calcTotal(activePlayer.scores, mode).upper)}</b></div><div><small>Bonus</small><b>{calcTotal(activePlayer.scores, mode).bonus ? '35 ✓' : '–'}</b></div></section>
    <div className="table-wrap"><table><thead><tr><th>Kategorie</th>{players.map((player, i) => <th key={player.name} className={i === active ? 'active-head' : ''}><span>{player.name}</span><small>{calcTotal(player.scores, mode).total}</small></th>)}</tr></thead><tbody>{categoryRows.map(row => row.key === '__lower' ? <tr className="section-row" key={row.key}><th colSpan={players.length + 1}>Unterer Teil</th></tr> : row.key === '__upper' ? <tr className="summary-row" key={row.key}><th>{row.label}</th>{players.map((player, i) => <td key={i} className={i === active ? 'active-column' : ''}>{calcTotal(player.scores, mode).upper > 0 ? '+' : ''}{calcTotal(player.scores, mode).upper}</td>)}</tr> : row.key === '__bonus' ? <tr className="bonus-row" key={row.key}><th>{row.label}<small>ab 0</small></th>{players.map((player, i) => <td key={i} className={i === active ? 'active-column' : ''}>{calcTotal(player.scores, mode).bonus || '–'}</td>)}</tr> : row.key === '__total' ? <tr className="grand-total" key={row.key}><th>{row.label}</th>{players.map((player, i) => <td key={i} className={i === active ? 'active-column' : ''}>{calcTotal(player.scores, mode).total}</td>)}</tr> : row.key === '__lower' ? null : <tr key={row.key}><th>{row.label}</th>{players.map((player, i) => <td key={i} className={i === active ? 'active-column' : ''}><ScoreCell value={player.scores[row.key]} active={i === active} disabled={i !== active} onClick={() => choose(row)}/></td>)}</tr>)}</tbody></table></div>
    <div className="table-footnote"><Dices size={15}/> Echt würfeln, hier nur eintragen</div>
    {selected && <InputSheet category={selected} mode={mode} onSave={save} onClose={() => setSelected(null)}/>} {celebrate && <div className="confetti" aria-hidden="true">✦ · ✦ · ✦<strong>Bonus!</strong>✦ · ✦ · ✦</div>}
    {showWinner && <div className="winner-backdrop"><section className="winner-card"><button className="close-winner" onClick={() => setShowWinner(false)}><X size={20}/></button><div className="trophy"><Trophy size={42}/></div><p>Spiel beendet</p><h2>{ranking[0].name} gewinnt!</h2><div className="ranking">{ranking.map((player, index) => <div key={player.name}><span>{index === 0 ? <Medal size={19}/> : index + 1}</span><b>{player.name}</b><strong>{player.total}</strong></div>)}</div><button className="primary-button" onClick={onExit}>Neue Runde</button></section></div>}
  </main>
}

export default function App() {
  const [dark, setDark] = useState(false)
  const [config, setConfig] = useState(null)
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  return <div className="app">{config ? <Game config={config} onExit={() => setConfig(null)} dark={dark} setDark={setDark}/> : <Setup onStart={setConfig} dark={dark} setDark={setDark}/>}</div>
}
