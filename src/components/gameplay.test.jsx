import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'
import { createGame, gameReducer } from '../domain/game.js'
import { getMode } from '../domain/modes.js'
import { persistState } from '../lib/storage.js'

describe('complete gameplay', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ games: [], players: [] }) }))
  })

  it('starts a standard game and advances after a score', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /spiel starten/i }))
    await user.click(screen.getByRole('button', { name: /mara.*einser eintragen/i }))
    await user.click(screen.getByRole('button', { name: '3 Punkte' }))
    await user.click(screen.getByRole('button', { name: /^eintragen$/i }))

    expect(screen.getByText(/timo ist dran/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mara.*einser korrigieren/i })).toHaveTextContent('3')
  })

  it('offers resume and discard for a stored unfinished game', () => {
    const activeGame = gameReducer(
      createGame(getMode('standard'), ['Mara', 'Timo'], '00000000-0000-4000-8000-000000000099'),
      { type: 'score', playerIndex: 0, category: 'ones', value: 3 },
    )
    persistState(localStorage, {
      version: 1,
      theme: 'light',
      setup: { mode: 'standard', names: ['Mara', 'Timo'] },
      activeGame,
      queue: [],
    })

    render(<App />)

    expect(screen.getByRole('button', { name: /fortsetzen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verwerfen/i })).toBeInTheDocument()
  })

  it('corrects an entered value without changing the turn and supports undo', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /spiel starten/i }))
    await user.click(screen.getByRole('button', { name: /mara.*einser eintragen/i }))
    await user.click(screen.getByRole('button', { name: '3 Punkte' }))
    await user.click(screen.getByRole('button', { name: /^eintragen$/i }))

    await user.click(screen.getByRole('button', { name: /mara.*einser korrigieren/i }))
    await user.click(screen.getByRole('button', { name: '4 Punkte' }))
    await user.click(screen.getByRole('button', { name: /korrektur speichern/i }))
    expect(screen.getByText(/timo ist dran/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /rückgängig/i }))
    expect(screen.getByRole('button', { name: /mara.*einser korrigieren/i })).toHaveTextContent('3')
  })

  it('configures free rules and prevents duplicate names', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /freie regeln/i }))
    const secondName = screen.getAllByLabelText(/name von spieler/i)[1]
    await user.clear(secondName)
    await user.type(secondName, 'mara')

    expect(screen.getByText(/namen müssen eindeutig/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /spiel starten/i })).toBeDisabled()
    expect(screen.getByLabelText(/würfelanzahl/i)).toHaveValue('7')
  })

  it('accepts an arbitrary whole-number score for a pair', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /spiel starten/i }))
    await user.click(screen.getByRole('button', { name: /mara.*1 paar eintragen/i }))
    await user.type(screen.getByRole('spinbutton', { name: /punkte für 1 paar/i }), '137')
    await user.click(screen.getByRole('button', { name: /^eintragen$/i }))

    expect(screen.getByRole('button', { name: /mara.*1 paar korrigieren/i })).toHaveTextContent('137')
  })

  it('accepts an arbitrary whole-number score for chance', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /spiel starten/i }))
    await user.click(screen.getByRole('button', { name: /mara.*chance eintragen/i }))

    expect(screen.getByRole('spinbutton', { name: /punkte für chance/i })).toBeInTheDocument()
    await user.type(screen.getByRole('spinbutton', { name: /punkte für chance/i }), '137')
    await user.click(screen.getByRole('button', { name: /^eintragen$/i }))

    expect(screen.getByRole('button', { name: /mara.*chance korrigieren/i })).toHaveTextContent('137')
  })

  it('adds and corrects multiple Yatzys in 50-point steps', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /spiel starten/i }))
    await user.click(screen.getByRole('button', { name: /mara.*yatzy eintragen/i }))
    await user.click(screen.getByRole('button', { name: /50 punkte hinzufügen/i }))
    await user.click(screen.getByRole('button', { name: /50 punkte hinzufügen/i }))
    expect(screen.getByText('100', { selector: '.repeat-score-value' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^eintragen$/i }))

    expect(screen.getByRole('button', { name: /mara.*yatzy korrigieren/i })).toHaveTextContent('100')
    await user.click(screen.getByRole('button', { name: /mara.*yatzy korrigieren/i }))
    await user.click(screen.getByRole('button', { name: /50 punkte hinzufügen/i }))
    await user.click(screen.getByRole('button', { name: /korrektur speichern/i }))

    expect(screen.getByText(/timo ist dran/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mara.*yatzy korrigieren/i })).toHaveTextContent('150')
  })
})
