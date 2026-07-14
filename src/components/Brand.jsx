import { Dices } from 'lucide-react'

export default function Brand({ compact = false }) {
  return <span className={`brand ${compact ? 'brand-compact' : ''}`}>
    <span className="brand-mark" aria-hidden="true"><Dices size={compact ? 18 : 22} /></span>
    <span>Würfelblock</span>
  </span>
}
