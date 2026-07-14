import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'
import { getCategories, getMode } from '../domain/modes.js'

function gameFixture() {
  const config = getMode('standard')
  const scores = Object.fromEntries(getCategories(config).map(category => [category.key, 0]))
  scores.yatzy = 50
  return {
    id: '10000000-0000-4000-8000-000000000001', mode: 'standard', config: { dice: 5, upperTarget: 63, bonusValue: 35, categoryVersion: 1 },
    completedAt: '2026-07-14T12:00:00.000Z',
    players: [
      { seat: 0, name: 'Mara', playerKey: 'mara', scores, upperTotal: 0, bonus: 0, lowerTotal: 50, total: 50, rank: 1 },
      { seat: 1, name: 'Timo', playerKey: 'timo', scores: { ...scores, yatzy: 0 }, upperTotal: 0, bonus: 0, lowerTotal: 0, total: 0, rank: 2 },
    ],
  }
}

function mockApi() {
  const game = gameFixture()
  vi.stubGlobal('fetch', vi.fn(async url => {
    if (url.startsWith('/api/games?')) return { ok: true, json: async () => ({ games: [game], nextCursor: null }) }
    if (url.startsWith('/api/leaderboard')) return { ok: true, json: async () => ({ players: [{ playerName: 'Mara', gamesPlayed: 4, wins: 3, bestScore: 280, totalScore: 920, lastPlayedAt: game.completedAt }] }) }
    if (url.startsWith('/api/games/')) return { ok: true, json: async () => ({ game }) }
    return { ok: true, json: async () => ({ game }) }
  }))
}

function navigationButton(name) {
  return within(screen.getByRole('navigation', { name: /hauptnavigation/i }))
    .getByRole('button', { name })
}

describe('history and leaderboard', () => {
  beforeEach(() => {
    localStorage.clear()
    mockApi()
  })

  it('renders history and opens a complete scorecard', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(navigationButton(/vergangene spiele/i))
    expect(await screen.findByText(/mara gewinnt/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /details/i }))

    expect(await screen.findByRole('table', { name: /spielblock vom/i })).toBeInTheDocument()
    expect(screen.getAllByText('50').length).toBeGreaterThan(0)
  })

  it('filters the leaderboard by mode and shows statistics', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(navigationButton(/bestenliste/i))
    expect(await screen.findByText('Mara')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/spielmodus/i), 'maxi')

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/leaderboard?mode=maxi&limit=100', expect.anything()))
    expect(screen.getByText('280')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows a retry action when the database is unavailable', async () => {
    fetch.mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    render(<App />)
    await user.click(navigationButton(/vergangene spiele/i))

    expect(await screen.findByText(/nicht geladen/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
  })
})
