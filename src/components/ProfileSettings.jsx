import { useEffect, useId, useRef, useState } from 'react'
import { dashboardText } from '../lib/dashboardText'

export default function ProfileSettings({ lang, children }) {
  const [open, setOpen] = useState(false)
  const container = useRef(null)
  const gear = useRef(null)
  const panelId = useId()
  const text = dashboardText[lang]

  function close(restoreFocus = false) {
    setOpen(false)
    if (restoreFocus) gear.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    function outside(event) {
      if (!container.current?.contains(event.target)) setOpen(false)
    }
    function escape(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        gear.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div className="profile-settings" ref={container} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) close()
    }}>
      <button ref={gear} type="button" className="profile-settings-toggle" aria-expanded={open} aria-controls={panelId}
        aria-label={open ? text.closeSettings : text.settings} title={open ? text.closeSettings : text.settings}
        onClick={() => setOpen(value => !value)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m10 3-.5 3-2 1.2L4.7 6l-2 3.5L5 11v2l-2.3 1.5 2 3.5 2.8-1.2 2 1.2.5 3h4l.5-3 2-1.2 2.8 1.2 2-3.5L19 13v-2l2.3-1.5-2-3.5-2.8 1.2-2-1.2L14 3Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <div id={panelId} className={`profile-settings-panel${open ? ' is-open' : ''}`} role="group" aria-label={text.settings}
        aria-hidden={!open} inert={!open} onClick={event => {
          if (event.target.closest('button')) close(true)
        }}>
        {children}
      </div>
    </div>
  )
}
