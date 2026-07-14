import { useEffect, useState } from 'react'
import { createGame, toSubmission } from './domain/game.js'
import { getMode } from './domain/modes.js'
import { loadPersistedState, persistState } from './lib/storage.js'
import Setup from './components/Setup.jsx'
import GameBoard from './components/GameBoard.jsx'

export default function App() {
  const [stored, setStored] = useState(() => loadPersistedState())
  const [view, setView] = useState('setup')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', stored.theme === 'dark')
    document.documentElement.style.colorScheme = stored.theme === 'dark' ? 'dark' : 'light'
    persistState(localStorage, stored)
  }, [stored])

  const toggleTheme = () => setStored(current => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))

  const startGame = setup => {
    const config = getMode(setup.mode, setup.mode === 'free' ? setup : {})
    const game = createGame(config, setup.names)
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

  return <Setup
    initialSetup={stored.setup}
    activeGame={stored.activeGame?.status === 'active' ? stored.activeGame : null}
    theme={stored.theme}
    onTheme={toggleTheme}
    onStart={startGame}
    onResume={() => setView('game')}
    onDiscard={() => setStored(current => ({ ...current, activeGame: null }))}
  />
}
