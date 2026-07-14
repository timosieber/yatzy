import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

export default function Dialog({ title, description, onClose, children, className = '' }) {
  const panel = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    panel.current?.focus()
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [onClose])

  return <div className="dialog-backdrop" onMouseDown={onClose}>
    <section ref={panel} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby={description ? 'dialog-description' : undefined} className={`dialog-panel ${className}`} onMouseDown={event => event.stopPropagation()}>
      <div className="dialog-handle" aria-hidden="true" />
      <header><div><h2 id="dialog-title">{title}</h2>{description && <p id="dialog-description">{description}</p>}</div><button type="button" className="icon-button" onClick={onClose} aria-label="Dialog schließen"><X size={20} /></button></header>
      {children}
    </section>
  </div>
}
