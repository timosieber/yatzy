import { History as HistoryIcon, Moon, PlayCircle, Sun, Trophy } from 'lucide-react'
import Brand from './Brand.jsx'

const items = [
  { key: 'setup', label: 'Neues Spiel', Icon: PlayCircle },
  { key: 'history', label: 'Vergangene Spiele', Icon: HistoryIcon },
  { key: 'leaderboard', label: 'Bestenliste', Icon: Trophy },
]

export default function AppShell({ view, onNavigate, theme, onTheme, queueCount, children }) {
  return <div className="app-shell">
    <aside className="side-navigation">
      <Brand />
      <NavigationItems view={view} onNavigate={onNavigate} />
      <button type="button" className="theme-nav" onClick={onTheme}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} Darstellung</button>
    </aside>
    <div className="app-content">
      {queueCount > 0 && <div className="sync-banner" role="status">{queueCount} {queueCount === 1 ? 'Spiel wartet' : 'Spiele warten'} auf Synchronisierung.</div>}
      {children}
    </div>
    <nav className="bottom-navigation" aria-label="Hauptnavigation"><NavigationItems view={view} onNavigate={onNavigate} /></nav>
  </div>
}

function NavigationItems({ view, onNavigate }) {
  return <>{items.map(({ key, label, Icon }) => <button type="button" key={key} className={view === key ? 'active' : ''} aria-current={view === key ? 'page' : undefined} onClick={() => onNavigate(key)}><Icon size={19} /><span>{label}</span></button>)}</>
}
