import { useEffect, useRef, useState } from 'react'

export function initialHeaderScroll(y = 0) {
  return { y: Math.max(0, y), pivot: Math.max(0, y), direction: 0, hidden: false }
}

export function nextHeaderScroll(state, scrollY) {
  const y = Math.max(0, scrollY)
  if (y <= 24) return initialHeaderScroll(y)
  const direction = Math.sign(y - state.y)
  if (!direction) return state
  const pivot = direction === state.direction ? state.pivot : state.y
  const distance = Math.abs(y - pivot)
  let hidden = state.hidden
  if (direction > 0 && y >= 64 && distance >= 16) hidden = true
  if (direction < 0 && distance >= 12) hidden = false
  return { y, pivot, direction, hidden }
}

export function useDashboardHeader(enabled, contentRef) {
  const [hidden, setHidden] = useState(false)
  const scrollState = useRef(initialHeaderScroll())

  useEffect(() => {
    setHidden(false)
    if (!enabled) return
    scrollState.current = initialHeaderScroll(window.scrollY)
    let frame = null
    function update() {
      frame = null
      const wasHidden = scrollState.current.hidden
      const next = nextHeaderScroll(scrollState.current, window.scrollY)
      // Keep keyboard-focused controls available while the user operates them.
      const focused = document.activeElement
      if (contentRef.current?.contains(focused) && focused.matches(':focus-visible')) next.hidden = false
      scrollState.current = next
      if (next.hidden !== wasHidden) setHidden(next.hidden)
    }
    function onScroll() {
      if (frame === null) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [enabled, contentRef])

  function reveal() {
    scrollState.current.hidden = false
    setHidden(false)
  }
  return { hidden: enabled && hidden, reveal }
}
