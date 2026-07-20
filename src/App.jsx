import { useEffect, useState } from 'react'
import { createGame, toSubmission } from './domain/game.js'
import { getMode } from './domain/modes.js'
import { loadPersistedState, persistState } from './lib/storage.js'
import { submitGame } from './api/client.js'
import Setup from './components/Setup.jsx'
import GameBoard from './components/GameBoard.jsx'
import AppShell from './components/AppShell.jsx'
import History from './components/History.jsx'
import Leaderboard from './components/Leaderboard.jsx'

export default function App() {
  const [stored, setStored] = useState(() => loadPersistedState())
  const [view, setView] = useState('setup')
  const [syncAttempt, setSyncAttempt] = useState(0)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', stored.theme === 'dark')
    document.documentElement.style.colorScheme = stored.theme === 'dark' ? 'dark' : 'light'
    persistState(localStorage, stored)
  }, [stored])

  useEffect(() => {
    const retry = () => setSyncAttempt(value => value + 1)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [])

  useEffect(() => {
    if (!stored.queue.length) return undefined
    let cancelled = false
    const synced = []
    ;(async () => {
      for (const game of stored.queue) {
        try {
          await submitGame(game)
          synced.push(game.id)
        } catch {
          break
        }
      }
      if (!cancelled && synced.length) {
        setStored(current => ({ ...current, queue: current.queue.filter(game => !synced.includes(game.id)) }))
      }
    })()
    return () => { cancelled = true }
  }, [stored.queue, syncAttempt])

  const toggleTheme = () => setStored(current => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))

  const startGame = setup => {
    const config = getMode(setup.mode, setup.mode === 'free' ? setup : {})
    const locker = setup.flow === 'locker'
    const game = createGame(config, setup.names, undefined, { locker })
    setStored(current => ({ ...current, setup, activeGame: game }))
    setView('game')
  }

  const updateGame = game => {
    setStored(current => {
      const alreadyQueued = current.queue.some(item => item.id === game.id)
      const queue = game.status === 'finished' && !alreadyQueued ? [...current.queue, toSubmission(game)] : current.queue
      return { ...current, activeGame: game, queue }
    })
  }

  if (view === 'game' && stored.activeGame) {
    return <GameBoard
      game={stored.activeGame}
      theme={stored.theme}
      onTheme={toggleTheme}
      onChange={updateGame}
      onExit={() => setView('setup')}
      onNewRound={() => {
        setStored(current => ({ ...current, activeGame: null }))
        setView('setup')
      }}
    />
  }

  return <AppShell view={view} onNavigate={setView} theme={stored.theme} onTheme={toggleTheme} queueCount={stored.queue.length}>
    {view === 'setup' && <Setup
      initialSetup={stored.setup}
      activeGame={stored.activeGame?.status === 'active' ? stored.activeGame : null}
      theme={stored.theme}
      onTheme={toggleTheme}
      onStart={startGame}
      onResume={() => setView('game')}
      onDiscard={() => setStored(current => ({ ...current, activeGame: null }))}
    />}
    {view === 'history' && <History />}
    {view === 'leaderboard' && <Leaderboard />}
  </AppShell>
}
